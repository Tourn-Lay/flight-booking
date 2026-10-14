"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { profileSchema } from "@/lib/validators";
import { authService } from "@/services/auth";

type Values = z.infer<typeof profileSchema>;

function ProfileForm() {
  const { user, setUser } = useAuth();
  const form = useForm<Values>({
    resolver: zodResolver(profileSchema),
    defaultValues: { first_name: user?.first_name ?? "", last_name: user?.last_name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" },
  });

  async function onSubmit(values: Values) {
    try {
      const updated = await authService.updateProfile(values);
      setUser(updated);
      form.reset(values);
      toast.success("Profile updated successfully.");
    } catch (e) {
      if (e instanceof ApiError) {
        for (const [field, msgs] of Object.entries(e.errors)) {
          if (field in values) form.setError(field as keyof Values, { message: Array.isArray(msgs) ? String(msgs[0]) : String(msgs) });
        }
        toast.error(e.message);
      } else toast.error("Could not update your profile.");
    }
  }

  const field = (name: keyof Values, label: string, type = "text") => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem><FormLabel>{label}</FormLabel><FormControl><Input type={type} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
    )} />
  );

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-6 text-2xl font-bold">My profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>Keep your contact details up to date.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {field("first_name", "First name")}
                {field("last_name", "Last name")}
              </div>
              {field("email", "Email", "email")}
              {field("phone", "Phone", "tel")}
              <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
                {form.formState.isSubmitting && <Loader2 className="animate-spin" />} Save changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileForm />
    </RequireAuth>
  );
}
