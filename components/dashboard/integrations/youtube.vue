<script setup lang="ts">
import { Youtube, LoaderCircle, Sparkles, Unplug } from "lucide-vue-next";
import { toast } from 'vue-sonner';
import IntegrationCard from './IntegrationCard.vue';

const isProcessing = ref(false); // Used for both connecting and disconnecting

// Fetch YouTube connection status
const { data: status, refresh: refreshStatus } = useFetch("/api/youtube/status");

async function connectYouTube() {
  if (status.value?.isConnected) return;

  isProcessing.value = true;

  try {
    const response = await $fetch("/api/youtube/connect", { method: "post" });
    if (response.success && response.authUrl) {
      // Redirect to YouTube's authorization page
      window.location.href = response.authUrl;
    } else {
      toast.error(response.message ?? "Не удалось инициировать подключение YouTube.");
    }
  } catch (error: any) {
    console.error('Error connecting to YouTube:', error);
    toast.error(error.data?.message ?? "Произошла ошибка при подключении YouTube.");
  } 
}

async function disconnectYouTube() {
  if (!status.value?.isConnected) return;
  isProcessing.value = true;

  try {
    const result = await $fetch("/api/youtube/disconnect", { method: "post" });
    toast.success(result.message || "YouTube успешно отключено.");

    await refreshStatus();
  } catch (error: any) {
    console.error('Error disconnecting YouTube:', error);
    toast.error(error.data?.message || "Не удалось отключить YouTube.");
  } finally {
    isProcessing.value = false;
  }
}
</script>

<template>
  <IntegrationCard
    title="YouTube"
    description="Подключите свой YouTube канал для автоматической публикации видео и управления сообществом."
    :isConnected="status?.isConnected" 
    :icon="Youtube"
    iconColor="text-[#FF0000]"
  >

    <div v-if="status?.isConnected">
      <UiButton variant="destructive" @click="disconnectYouTube" :disabled="isProcessing">
        <LoaderCircle v-if="isProcessing" class="mr-2 size-4 animate-spin" />
        <Unplug v-else class="mr-2 size-4" />
        Отключить YouTube
      </UiButton>
    </div>
    <div v-else>
      <UiButton @click="connectYouTube" :disabled="isProcessing">
        <LoaderCircle v-if="isProcessing" class="mr-2 size-4 animate-spin" />
        <Sparkles v-else class="mr-0.5 size-4" />
        Подключить YouTube
      </UiButton>
    </div>
  </IntegrationCard>
</template>
