<script setup lang="ts">
import {authClient} from "~/lib/auth-client";
import {Input} from "~/components/ui/input";
import {Button} from "~/components/ui/button";
import {Label} from "reka-ui";
import {Separator} from "~/components/ui/separator";
import {Loader2} from "lucide-vue-next"

const sending = ref(false);

async function signIn(provider: "google" | "vk"): Promise<void> {
  sending.value = true;
  try {
    const data = await authClient.signIn.social({
      provider
    })

    console.log(data)
  } finally {
    sending.value = false;
  }
}

const session = authClient.useSession()


onMounted(() => {
  console.log(session.value)
})

const emailSuccess = ref(false)
const email = ref("")

async function signInMagicLink(): Promise<void> {
  sending.value = true;

  try {
    await authClient.signIn.magicLink({
      email: email.value,
      callback: "/dashboard"
    })

    emailSuccess.value = true
  } finally {
    sending.value = false;
  }
}

</script>

<template>
  <div class="absolute top-[50%] left-[50%] -translate-[50%] max-w-[400px]">
    <h1 class="text-xl text-neutral-800 font-medium">Взрыв аудитории</h1>
    <h2 class="text-xl text-neutral-400 font-medium mb-5">Войдите в свой аккаунт blogoctopus</h2>

    <div class="space-y-1.5 mt-7">
      <Button :disabled="sending" variant="outline" class="w-full" @click="signIn('google')">
        <img alt="google icon" src="assets/images/google-icon.svg" >
        Google
      </Button>
      <Button :disabled="sending" variant="outline" class="w-full" @click="signIn('vk')">Vk</Button>
    </div>
    <Separator label="some" class="my-7"/>
    <div class="">
      <Label class="text-neutral-500">E-mail</Label>
      <Input :disabled="sending || emailSuccess" type="email" placeholder="ivan.ivanov@mail.ru" v-model="email"
             @keydown.enter.exact="signInMagicLink"></Input>
      <Button :disabled="sending" class="mt-5 w-full" @click="signInMagicLink">
        <Loader2 v-if="sending" class="animate-spin size-4"></Loader2>
        Продолжить
      </Button>
    </div>
    <p class="text-xs text-neutral-400 mt-5">Продолжая вы соглашаетесь с нашими <a class="underline" href="">Правилами
      пользования</a> и <a class="underline" href="">Политикой конфиденциальности</a></p>
  </div>
</template>
