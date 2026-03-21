import { LoginView } from "./LoginView";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { error?: string }));
  return <LoginView authError={params.error} />;
}