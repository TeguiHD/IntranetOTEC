import { LoginView } from "./LoginView";

type LoginPageProps = {
  searchParams: {
    error?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return <LoginView authError={searchParams.error} />;
}