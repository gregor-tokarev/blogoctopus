<script setup lang="ts">
import { Linkedin, LoaderCircle, Sparkles, Unplug } from "lucide-vue-next";
import { toast } from "vue-sonner";
import IntegrationCard from "./IntegrationCard.vue";

const isProcessing = ref(false); // Used for both connecting and disconnecting

// Fetch LinkedIn connection status
const { data: status, refresh: refreshStatus } = useFetch(
  "/api/linkedin/status",
);

async function connectLinkedIn() {
  if (status.value?.isConnected) return;

  isProcessing.value = true;

  try {
    const response = await $fetch("/api/linkedin/connect", { method: "post" });
    if (response.success && response.authUrl) {
      // Redirect to LinkedIn's authorization page
      window.location.href = response.authUrl;
    } else {
      toast.error(
        response.message ?? "Не удалось инициировать подключение LinkedIn.",
      );
    }
  } catch (error: any) {
    console.error("Error connecting to LinkedIn:", error);
    toast.error(
      error.data?.message ?? "Произошла ошибка при подключении LinkedIn.",
    );
  }
}

async function disconnectLinkedIn() {
  if (!status.value?.isConnected) return;
  isProcessing.value = true;

  try {
    const result: any = await $fetch("/api/linkedin/disconnect", {
      method: "post",
    });
    toast.success(result.message || "LinkedIn успешно отключено.");

    await refreshStatus();
  } catch (error: any) {
    console.error("Error disconnecting LinkedIn:", error);
    toast.error(error.data?.message || "Не удалось отключить LinkedIn.");
  } finally {
    isProcessing.value = false;
  }
}
</script>

<template>
  <IntegrationCard
    title="LinkedIn"
    description="Подключите свой аккаунт LinkedIn для автоматической публикации профессиональных обновлений и статей."
    :isConnected="status?.isConnected"
    :icon="Linkedin"
    iconColor="text-[#0077B5]"
  >
    <div v-if="status?.isConnected">
      <UiButton
        variant="destructive"
        @click="disconnectLinkedIn"
        :disabled="isProcessing"
      >
        <LoaderCircle v-if="isProcessing" class="mr-2 size-4 animate-spin" />
        <Unplug v-else class="mr-2 size-4" />
        Отключить LinkedIn
      </UiButton>
    </div>
    <div v-else>
      <UiButton
        @click="connectLinkedIn"
        :disabled="isProcessing"
        class="bg-[#0077B5] hover:bg-[#005E90] text-white"
      >
        <LoaderCircle v-if="isProcessing" class="mr-2 size-4 animate-spin" />
        <Sparkles v-else class="mr-0.5 size-4" />
        Подключить LinkedIn
      </UiButton>
    </div>
  </IntegrationCard>
</template>
