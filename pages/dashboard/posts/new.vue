<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const title = ref("");
const content = ref("");
const images = ref<Array<{ id: string; url: string; file?: File }>>([]);
const isUploading = ref(false);
const uploadProgress = ref(0);
const dragActive = ref(false);

// Handle paste event
const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith("image/")) {
      event.preventDefault();
      const file = item.getAsFile();
      if (file) {
        await handleImageFile(file);
      }
    }
  }
};

// Handle drop event
const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  dragActive.value = false;

  const files = event.dataTransfer?.files;
  if (!files) return;

  for (const file of files) {
    if (file.type.startsWith("image/")) {
      await handleImageFile(file);
    }
  }
};

// Handle file input change
const handleFileInput = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (!files) return;

  for (const file of files) {
    if (file.type.startsWith("image/")) {
      await handleImageFile(file);
    }
  }
};

// Process image file
const handleImageFile = async (file: File) => {
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  const localUrl = URL.createObjectURL(file);
  
  // Add image to preview immediately
  images.value.push({ id, url: localUrl, file });

  // Upload to S3 with progress tracking
  try {
    isUploading.value = true;
    uploadProgress.value = 0;
    
    const formData = new FormData();
    formData.append("image", file);

    // Use XMLHttpRequest for progress tracking
    const response = await new Promise<{ url: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          uploadProgress.value = Math.round((event.loaded / event.total) * 100);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch (e) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });
      
      xhr.open('POST', '/api/posts/upload-image');
      xhr.send(formData);
    });

    // Update image URL with S3 URL
    const imageIndex = images.value.findIndex((img) => img.id === id);
    if (imageIndex !== -1) {
      images.value[imageIndex].url = response.url;
      images.value[imageIndex].file = undefined; // Remove file reference
      URL.revokeObjectURL(localUrl); // Clean up local URL
    }
  } catch (error) {
    console.error("Image upload failed:", error);
    // Remove failed image
    images.value = images.value.filter((img) => img.id !== id);
    URL.revokeObjectURL(localUrl);
    // Show error notification
    alert("Failed to upload image. Please try again.");
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

// Remove image
const removeImage = (id: string) => {
  const image = images.value.find((img) => img.id === id);
  if (image?.file) {
    URL.revokeObjectURL(image.url);
  }
  images.value = images.value.filter((img) => img.id !== id);
};

// Handle drag events
const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  dragActive.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  dragActive.value = false;
};

// Save post
const savePost = async () => {
  if (!title.value.trim() || !content.value.trim()) {
    alert("Please fill in both title and content");
    return;
  }

  try {
    const imageUrls = images.value.map((img) => img.url);
    
    await $fetch("/api/posts", {
      method: "POST" as const,
      body: {
        title: title.value,
        content: content.value,
        images: imageUrls,
      },
    });

    router.push("/dashboard/posts");
  } catch (error) {
    console.error("Failed to save post:", error);
    alert("Failed to save post. Please try again.");
  }
};

// Mount/unmount handlers
onMounted(() => {
  document.addEventListener("paste", handlePaste);
});

onUnmounted(() => {
  document.removeEventListener("paste", handlePaste);
  // Clean up any remaining local URLs
  images.value.forEach((img) => {
    if (img.file) {
      URL.revokeObjectURL(img.url);
    }
  });
});
</script>

<template>
  <div class="max-w-4xl mx-auto py-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold tracking-tight">Новый пост</h1>
      <div class="flex gap-3">
        <NuxtLink to="/dashboard/posts">
          <UiButton variant="outline">Отмена</UiButton>
        </NuxtLink>
        <UiButton @click="savePost" :disabled="isUploading">
          <Icon v-if="isUploading" name="lucide:loader-2" class="size-4 animate-spin mr-2" />
          Сохранить
        </UiButton>
      </div>
    </div>

    <UiCard>
      <UiCardHeader>
        <UiCardTitle>Детали поста</UiCardTitle>
      </UiCardHeader>
      <UiCardContent class="space-y-4">
        <!-- Title input -->
        <div>
          <UiLabel for="title">Заголовок</UiLabel>
          <UiInput
            id="title"
            v-model="title"
            placeholder="Введите заголовок поста"
            class="mt-1.5"
          />
        </div>

        <!-- Content textarea -->
        <div>
          <UiLabel for="content">Содержание</UiLabel>
          <UiTextarea
            id="content"
            v-model="content"
            placeholder="Введите содержание поста"
            rows="6"
            class="mt-1.5"
          />
        </div>

        <!-- Image upload area -->
        <div>
          <UiLabel>Изображения</UiLabel>
          <div class="mt-1.5 space-y-4">
            <!-- Drop zone -->
            <div
              @drop="handleDrop"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              :class="[
                'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              <input
                type="file"
                multiple
                accept="image/*"
                @change="handleFileInput"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Icon name="lucide:image-plus" class="size-8 mx-auto text-gray-400 mb-2" />
              <p class="text-sm text-gray-600">
                Перетащите изображения сюда, вставьте из буфера обмена или
                <span class="text-primary font-medium">выберите файлы</span>
              </p>
              <p class="text-xs text-gray-500 mt-1">
                Поддерживаются форматы: PNG, JPG, GIF, WebP
              </p>
            </div>

            <!-- Image preview grid -->
            <div v-if="images.length > 0" class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div
                v-for="image in images"
                :key="image.id"
                class="relative group rounded-lg overflow-hidden border border-gray-200"
              >
                <img
                  :src="image.url"
                  :alt="`Image ${image.id}`"
                  class="w-full h-32 object-cover"
                />
                <div
                  class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <button
                    @click="removeImage(image.id)"
                    class="p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
                  >
                    <Icon name="lucide:x" class="size-4 text-gray-700" />
                  </button>
                </div>
                <!-- Upload indicator -->
                <div
                  v-if="image.file"
                  class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 flex items-center gap-1"
                >
                  <Icon name="lucide:loader-2" class="size-3 animate-spin" />
                  Загружается...
                </div>
              </div>
            </div>

            <!-- Upload progress -->
            <div v-if="isUploading && uploadProgress > 0" class="space-y-2">
              <div class="flex justify-between text-sm">
                <span>Загрузка изображений...</span>
                <span>{{ uploadProgress }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="bg-primary h-2 rounded-full transition-all duration-300"
                  :style="{ width: `${uploadProgress}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </UiCardContent>
    </UiCard>
  </div>
</template>