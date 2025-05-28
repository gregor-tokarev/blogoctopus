import dayjs from "dayjs";
import "dayjs/locale/ru";

export default defineNuxtPlugin(() => {
  // Set Russian locale globally
  dayjs.locale("ru");
});
