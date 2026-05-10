import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth, useLogin } from "@repo/auth";
import { Redirect, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginFormValues } from "./types";
import { LoginView } from "./LoginView";

export function LoginPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { mutate: login, isPending, error, isError } = useLogin("player");
    const [passwordVisible, setPasswordVisible] = useState(false);

    const { control, handleSubmit } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            tenant_subdomain: "",
            email: "",
            password: "",
        },
    });

    if (isAuthenticated) {
        return <Redirect href={"/(player)/home" as Href} />;
    }

    const onSubmit = (values: LoginFormValues) => {
        login(
            {
                tenant_subdomain: values.tenant_subdomain.trim(),
                email: values.email.trim(),
                password: values.password,
            },
            {
                onSuccess: () => {
                    router.replace("/(player)/home" as Href);
                },
            }
        );
    };

    return (
        <LoginView
            control={control}
            onSubmit={handleSubmit(onSubmit)}
            isPending={isPending}
            isError={isError}
            errorMessage={error instanceof Error ? error.message : "Invalid credentials"}
            passwordVisible={passwordVisible}
            onTogglePassword={() => setPasswordVisible((v) => !v)}
        />
    );
}
