import { createClient } from '@supabase/supabase-js'
import { supabaseAnon, supabaseAdmin } from '../supabaseClient' // reaproveita

export const signUp  = (e: string, p: string) =>
  supabaseAnon.auth.signUp({ email: e, password: p })

export const signIn  = (e: string, p: string) =>
  supabaseAnon.auth.signInWithPassword({ email: e, password: p })

export const signWithGoogle = (redirect: string) =>
  supabaseAnon.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect } })

export const sendReset = (email: string, redirect: string) =>
  supabaseAnon.auth.resetPasswordForEmail(email, { redirectTo: redirect })

export const deleteUser = (uid: string) =>
  supabaseAdmin.auth.admin.deleteUser(uid)
