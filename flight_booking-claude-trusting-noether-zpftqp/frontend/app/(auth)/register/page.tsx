"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { ApiError } from "@/lib/api";
import { registerSchema } from "@/lib/validators";

type Values = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(registerSchema),
    defaultValues: { first_name: "", last_name: "", email: "", phone: "", password: "", confirm_password: "" },
  });

  async function onSubmit(values: Values) {
    setError(null);
    try {
      await register({ email: values.email, password: values.password, first_name: values.first_name, last_name: values.last_name, phone: values.phone });
      toast.success("Account created. Welcome aboard!");
      router.replace("/");
    } catch (e) {
      if (e instanceof ApiError) {
        // map backend field errors onto the form
        for (const [field, msgs] of Object.entries(e.errors)) {
          if (field in values) form.setError(field as keyof Values, { message: Array.isArray(msgs) ? String(msgs[0]) : String(msgs) });
        }
        setError(e.message);
      } else setError("Registration failed.");
    }
  }

  const text = (name: keyof Values, label: string, type = "text", auto?: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem><FormLabel>{label}</FormLabel><FormControl><Input type={type} autoComplete={auto} {...field} /></FormControl><FormMessage /></FormItem>
    )} />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Register to book flights and manage your trips.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              {text("first_name", "First name", "text", "given-name")}
              {text("last_name", "Last name", "text", "family-name")}
            </div>
            {text("email", "Email", "email", "email")}
            {text("phone", "Phone (optional)", "tel", "tel")}
            {text("password", "Password", "password", "new-password")}
            {text("confirm_password", "Confirm password", "password", "new-password")}
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="animate-spin" />} Create account
            </Button>
          </form>
        </Form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Log in</Link>
        </p>
      </CardContent>
    </Card>
  );
}
