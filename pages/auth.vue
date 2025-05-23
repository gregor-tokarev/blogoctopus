<script setup lang="ts">
import useVuelidate from "@vuelidate/core";
import { email as emailValidator, required } from "@vuelidate/validators";
import { Loader2 } from "lucide-vue-next";
import { Label } from "reka-ui";
import { reactive, ref } from "vue";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { authClient } from "~/lib/auth-client";

const sending = ref(false);
const state = reactive({ email: "" });
const emailSuccess = ref(false);
const v$ = useVuelidate({ email: { required, email: emailValidator } }, state);

async function signIn(provider: "google"): Promise<void> {
  sending.value = true;
  try {
    const data = await authClient.signIn.social({
      provider,
    });
  } finally {
    sending.value = false;
  }
}

async function signInMagicLink(): Promise<void> {
  if (emailSuccess.value) return;

  v$.value.$touch();
  if (v$.value.$invalid) return;

  sending.value = true;

  try {
    await authClient.signIn.magicLink({
      email: state.email,
      callbackURL: "/dashboard",
    });

    emailSuccess.value = true;
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="absolute top-[50%] left-[50%] -translate-[50%] max-w-[400px]">
    <h1 class="text-xl text-neutral-800 font-medium">Взрыв аудитории</h1>
    <h2 class="text-xl text-neutral-400 font-medium mb-5">
      Войдите в свой аккаунт blogoctopus
    </h2>

    <div class="space-y-1.5 mt-7">
      <Button
        :disabled="sending"
        variant="outline"
        class="w-full"
        @click="signIn('google')"
      >
        <img alt="google icon" src="~/assets/images/google-icon.svg" />
        Google
      </Button>
    </div>
    <Separator label="some" class="my-7" />
    <div class="">
      <Label class="text-neutral-500">E-mail</Label>
      <Input
        :disabled="sending || emailSuccess"
        type="email"
        placeholder="ivan.ivanov@mail.ru"
        v-model="state.email"
        @keydown.enter.exact="signInMagicLink"
        @blur="v$.email.$touch()"
      ></Input>
      <p
        :style="{ opacity: v$.email.$error ? 1 : 0 }"
        class="text-red-500 text-sm transition-opacity duration-300 block h-6"
      >
        <span v-show="v$.email.required.$invalid">Email обязателен</span>
        <span v-show="v$.email.email.$invalid">Неверный email</span>
      </p>
      <Button
        :disabled="sending || emailSuccess"
        class="mt-3 w-full"
        :variant="emailSuccess ? 'success' : 'default'"
        @click="signInMagicLink"
      >
        <Loader2 v-if="sending" class="animate-spin size-4"></Loader2>
        {{ emailSuccess ? "Откройте email" : "Продолжить" }}
      </Button>
    </div>
    <p class="text-xs text-neutral-400 mt-3">
      Продолжая вы соглашаетесь с нашими
      <router-link class="underline" to="/terms"
        >Правилами пользования</router-link
      >
      и
      <router-link class="underline" to="/privacy"
        >Политикой конфиденциальности</router-link
      >
    </p>
  </div>
</template>
