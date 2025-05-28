import dayjs from "dayjs";

export function formatHumanReadableDate(date: Date | string | null) {
  if (!date) return "";

  const dateObj = dayjs(date);
  const now = dayjs();
  const diffDays = now.diff(dateObj, "day");

  if (diffDays === 0) {
    return `Сегодня, ${dateObj.format("HH:mm")}`;
  } else if (diffDays === 1) {
    return `Вчера, ${dateObj.format("HH:mm")}`;
  } else if (diffDays < 7) {
    return dateObj.format("dddd, HH:mm");
  } else {
    return dateObj.format("DD MMMM YYYY");
  }
}
