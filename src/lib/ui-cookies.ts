/**
 * Cookie names shared between server components and client components.
 *
 * These live outside the client modules on purpose: a value exported from a
 * `"use client"` file arrives in a server component as a client reference, not
 * the value itself.
 */
export const SIDEBAR_COOKIE = "phade_sidebar";
