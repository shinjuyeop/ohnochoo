// Run with a separately installed PGlite module; see docs/DEVELOPMENT.md.
const { PGlite } = require("@electric-sql/pglite");
const { readFileSync } = require("node:fs");
const assert = require("node:assert/strict");
const repo = require("node:path").resolve(__dirname, "../..");
const schema = readFileSync(`${repo}/supabase/schema.sql`, 'utf8').replace('create extension if not exists "pgcrypto";', '');
const migration = readFileSync(`${repo}/supabase/migrations/20260928160000_song_records.sql`, 'utf8');
(async () => {
for (const fresh of [true, false]) {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
    create table auth.users(id uuid primary key); create table storage.objects(id uuid, bucket_id text, name text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
    create publication supabase_realtime;`);
  if (fresh) await db.exec(schema); else {
    await db.exec(schema.slice(0, schema.indexOf('-- Weekly recommendations')));
    await db.exec(migration);
  }
  const admin = '11111111-1111-4111-8111-111111111111';
  const member = '22222222-2222-4222-8222-222222222222';
  await db.exec(`insert into auth.users values ('${admin}'); insert into members(id,name) values ('${admin}','Admin'),('${member}','Friend');
    insert into admin_users values ('${admin}','${admin}',now());`);
  const asAnon = () => db.exec(`reset role; select set_config('request.jwt.claim.sub','',false); set role anon;`);
  const asAdmin = () => db.exec(`reset role; select set_config('request.jwt.claim.sub','${admin}',false); set role authenticated;`);
  const add = async (name, rating=4) => (await db.query(`select (public.add_song_with_metadata('${name}','Artist','Friend','${member}',null,${rating},'Recommendation','https://music.apple.com/kr/album/test/123','Album')).id`)).rows[0].id;
  await asAnon();
  const old = await add('Old'); const young = await add('Young'); const other = await add('Other');
  await assert.rejects(add('Invalid',4.2));
  assert.equal((await db.query(`select * from songs where title='Invalid'`)).rows.length,0);
  const vote = (await db.query(`select * from votes where "songId"='${old}'`)).rows[0];
  await db.exec(`insert into vote_replies(vote_id,author,member_id,body) values ('${vote.id}','Admin','${admin}','Keep this reply')`);
  await assert.rejects(db.exec(`select archive_songs(array['${old}'::uuid])`));
  await asAdmin();
  await db.exec(`update songs set "createdAt"=now()-interval '8 days' where id in ('${old}','${other}')`);
  await assert.rejects(db.exec(`select archive_songs(array['${old}'::uuid,'${young}'::uuid])`));
  assert.equal((await db.query(`select archived_at from songs where id='${old}'`)).rows[0].archived_at,null);
  const snapshot = (await db.query(`select * from votes where "songId"='${old}'`)).rows;
  await db.exec(`select archive_songs(array['${old}'::uuid])`);
  const archived = (await db.query(`select * from songs where id='${old}'`)).rows[0];
  assert.ok(archived.archived_at);
  assert.equal(archived.album_url,'https://music.apple.com/kr/album/test/123');
  await db.exec(`select archive_songs(array['${old}'::uuid])`);
  assert.equal(String((await db.query(`select archived_at from songs where id='${old}'`)).rows[0].archived_at),String(archived.archived_at));
  await assert.rejects(db.exec(`delete from songs where id='${old}'`));
  await assert.rejects(db.exec(`update songs set archived_at=null where id='${old}'`));
  await assert.rejects(db.exec(`update songs set title='Changed' where id='${old}'`));
  await assert.rejects(db.exec(`insert into mutigoeul_songs("songId") values ('${old}')`));
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','${member}',false); set role authenticated;`);
  await assert.rejects(db.exec(`select archive_songs(array['${other}'::uuid])`));
  await asAnon();
  await assert.rejects(db.exec(`select save_member_vote('${old}','Admin','${admin}','승격',5,'Late vote')`));
  await assert.rejects(db.exec(`select save_member_vote('${old}','Friend','${member}','방출',1,'Edited vote')`));
  await assert.rejects(db.exec(`update votes set "songId"='${young}' where id='${vote.id}'`));
  await assert.rejects(db.exec(`insert into vote_replies(vote_id,author,body) values ('${vote.id}','Late','No')`));
  await assert.rejects(db.exec(`insert into songs(title,artist,adder,archived_at) values ('Bad','A','B',now())`));
  assert.deepEqual((await db.query(`select * from votes where "songId"='${old}'`)).rows,snapshot);
  assert.equal((await db.query(`select * from vote_replies where vote_id='${vote.id}'`)).rows.length,1);
  // Ordinary recommendations and evaluations still work after installing the migration.
  await db.exec(`select save_member_vote('${young}','Admin','${admin}','보류',3.5,'Still works')`);
  await db.exec(`select add_song_with_initial_vote('Ordinary','A','Admin','${admin}',null,4,'Works')`);
  await asAdmin();
  await db.exec(`insert into mutigoeul_songs("songId") values ('${other}')`);
  await assert.rejects(db.exec(`select archive_songs(array['${other}'::uuid])`));
  await asAnon();
  await assert.rejects(db.exec(`select save_member_vote('${other}','Admin','${admin}','승격',5,'Closed')`));
  await db.close();
  console.log(`${fresh ? 'Fresh schema' : 'Upgrade without weekly themes'}: atomic archive, permissions, frozen votes/replies/metadata, idempotency, album metadata, rollback and ordinary voting passed`);
}

})().catch((error) => { console.error(error); process.exitCode = 1; });
