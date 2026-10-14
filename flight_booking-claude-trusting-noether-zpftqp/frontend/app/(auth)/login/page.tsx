"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { loginSchema } from "@/lib/validators";

type Values = z.infer<typeof loginSchema>;

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  async function onSubmit(values: Values) {
    setError(null);
    try {
      const user = await login(values.email, values.password);
      toast.success(`Welcome back, ${user.first_name || user.email}!`);
      router.replace(next && next.startsWith("/") ? next : user.role === "ADMIN" ? "/admin" : "/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    }
  }

  function fill(email: string, password: string) {
    form.setValue("email", email);
    form.setValue("password", password);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Log in to manage your bookings.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" autoComplete="email" placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" autoComplete="current-password" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="animate-spin" />} Log in
            </Button>
          </form>
        </Form>
        <div className="mt-5 rounded-md bg-secondary p-3 text-xs text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Demo accounts</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => fill("customer@flight.local", "Customer123!")}>Use customer</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => fill("admin@flight.local", "Admin123!")}>Use admin</Button>
          </div>
        </div>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          New here? <Link href="/register" className="font-medium text-primary hover:underline">Create an account</Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}
