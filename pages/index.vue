<script setup lang="ts">
import { authClient } from "~/lib/auth-client";
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

onMounted(async () => {
  try {
    // Check if user is authenticated
    const { data: session } = await authClient.getSession();

    if (session?.user) {
      // User is logged in, redirect to dashboard
      router.push("/dashboard");
    } else {
      // User is not logged in, redirect to auth
      router.push("/auth");
    }
  } catch (error) {
    console.error("Authentication check failed:", error);
    // Fallback to auth page in case of errors
    router.push("/auth");
  }
});
</script>

<template>
  <div class="flex justify-center items-center h-screen">
    <p>Redirecting...</p>
  </div>
</template>
