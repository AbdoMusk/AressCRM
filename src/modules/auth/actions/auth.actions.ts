"use server";

import {
  signInWithEmail,
  signUpWithEmail,
  signOut,
} from "@/modules/auth/services/auth.service";

export async function loginAction(email: string, password: string) {
  return signInWithEmail(email, password);
}

export async function signupAction(
  email: string,
  password: string,
  fullName: string
) {
  return signUpWithEmail(email, password, fullName);
}

export async function logoutAction(userId: string) {
  await signOut(userId);
}
