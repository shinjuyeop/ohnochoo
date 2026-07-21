import { useState } from "react";
import { LoaderCircle, LockKeyhole, LogIn } from "lucide-react";
import { useToast } from "../../components/ui/Toast";
import { errorMessage } from "../../lib/utils";
import { useAdminAuth } from "./AdminAuthContext";

export function AdminLoginForm() {
  const { login, isLoading } = useAdminAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await login(email, password);
      setPassword("");
      toast("관리자 모드로 전환했어요.", "success");
    } catch (error) {
      toast(`로그인 실패: ${errorMessage(error)}`, "error");
    }
  };

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <div className="admin-login-intro">
        <span><LockKeyhole /></span>
        <div><b>관리자 로그인</b><p>등록된 관리자 계정으로 로그인해 주세요.</p></div>
      </div>
      <label><span>이메일</span><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label><span>비밀번호</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      <button className="primary-button" disabled={isLoading || !email.trim() || !password}>
        {isLoading ? <LoaderCircle className="spin" /> : <LogIn />} 관리자 로그인
      </button>
    </form>
  );
}
