<script setup lang="ts">
import {authClient} from "~/lib/auth-client";

async function signIn(): Promise<void> {
  const data = await authClient.signIn.social({
    provider: "google"
  })

  console.log(data)
}

</script>

<template>
  <div>
    <h1 class="text-9xl">title</h1>
    <UiButton @click="signIn">google</UiButton>
  </div>
</template>
