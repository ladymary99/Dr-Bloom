"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "en" | "az" | "ru";
export const LANGS: { code: Lang; label: string; locale: string }[] = [
  { code: "en", label: "English", locale: "en-GB" },
  { code: "az", label: "Azərbaycanca", locale: "az-AZ" },
  { code: "ru", label: "Русский", locale: "ru-RU" },
];

type LangState = { lang: Lang; setLang: (l: Lang) => void };
export const useLang = create<LangState>()(
  persist((set) => ({ lang: "en", setLang: (lang) => set({ lang }) }), { name: "hms-lang" })
);

/**
 * Dictionary keyed by the English source string. Anything missing falls back to English,
 * so untranslated screens never show blanks or keys. Please have a native speaker review
 * the az / ru wording before launch.
 */
const DICT: Record<Exclude<Lang, "en">, Record<string, string>> = {
  az: {
    "Overview": "Ümumi baxış", "Book appointment": "Qəbula yazıl", "Appointments": "Qəbullar",
    "Medical records": "Tibbi qeydlər", "Billing": "Ödənişlər", "Messages": "Mesajlar", "Documents": "Sənədlər",
    "Profile": "Profil", "Settings": "Tənzimləmələr", "Sign out": "Çıxış", "Notifications": "Bildirişlər",
    "Patient Portal": "Pasiyent portalı", "Save changes": "Dəyişiklikləri saxla", "Cancel": "Ləğv et", "Close": "Bağla",
    "Loading": "Yüklənir", "Try again": "Yenidən cəhd et", "Search": "Axtar", "Download": "Yüklə", "Delete": "Sil", "Upload": "Yüklə",
    "Confirm": "Təsdiq et", "Back": "Geri", "Next": "Növbəti", "Send": "Göndər", "Print": "Çap et", "View all": "Hamısına bax",
    "Pending": "Gözləyir", "Confirmed": "Təsdiqləndi", "Checked in": "Qəbul olundu", "Completed": "Tamamlandı",
    "Cancelled": "Ləğv edildi", "No-show": "Gəlmədi", "Unpaid": "Ödənilməyib", "Partially paid": "Qismən ödənilib",
    "Paid": "Ödənilib", "Refunded": "Geri qaytarılıb", "Upcoming": "Gələcək", "Past": "Keçmiş",
    "Find a doctor": "Həkim tap", "Choose a time": "Vaxt seçin", "Reason for visit": "Müraciət səbəbi",
    "In person": "Üzbəüz", "Video visit": "Video qəbul", "Reschedule": "Vaxtı dəyiş", "Add to calendar": "Təqvimə əlavə et",
    "Join video visit": "Video qəbula qoşul", "Visits": "Qəbullar", "Prescriptions": "Reseptlər",
    "Lab & imaging": "Analiz və görüntüləmə", "Vaccinations": "Peyvəndlər", "Invoices": "Hesablar",
    "Insurance claims": "Sığorta tələbləri", "Pay online": "Onlayn ödə", "Receipt": "Qəbz", "Balance": "Qalıq",
    "Personal information": "Şəxsi məlumatlar", "Medical information": "Tibbi məlumatlar", "Insurance": "Sığorta",
    "Emergency contact": "Təcili əlaqə", "Language": "Dil", "Password": "Parol", "Email": "E-poçt",
    "Privacy & data": "Məxfilik və məlumatlar", "Two-factor authentication": "İki mərhələli doğrulama",
    "Notification preferences": "Bildiriş seçimləri", "New message": "Yeni mesaj", "Subject": "Mövzu", "Message": "Mesaj",
    "Mark all read": "Hamısını oxunmuş et", "No notifications yet.": "Hələ bildiriş yoxdur.",
    "Welcome back": "Xoş gəlmisiniz", "Next appointment": "Növbəti qəbul", "Profile completion": "Profilin doldurulması",
    "Allergies": "Allergiyalar", "Chronic conditions": "Xroniki xəstəliklər", "Current medications": "Hazırda qəbul edilən dərmanlar",
    "Blood type": "Qan qrupu", "Date of birth": "Doğum tarixi", "Gender": "Cins", "Phone": "Telefon", "Address": "Ünvan",
    "Skip to content": "Məzmuna keç", "You will be signed out soon": "Tezliklə sessiyanız bağlanacaq",
    "Stay signed in": "Sessiyanı davam etdir", "Accept and continue": "Qəbul et və davam et",
    "Privacy policy": "Məxfilik siyasəti", "Download my data": "Məlumatlarımı yüklə", "Request account deletion": "Hesabın silinməsini tələb et",
  },
  ru: {
    "Overview": "Обзор", "Book appointment": "Записаться на приём", "Appointments": "Приёмы",
    "Medical records": "Медицинская карта", "Billing": "Оплата", "Messages": "Сообщения", "Documents": "Документы",
    "Profile": "Профиль", "Settings": "Настройки", "Sign out": "Выйти", "Notifications": "Уведомления",
    "Patient Portal": "Портал пациента", "Save changes": "Сохранить изменения", "Cancel": "Отмена", "Close": "Закрыть",
    "Loading": "Загрузка", "Try again": "Повторить", "Search": "Поиск", "Download": "Скачать", "Delete": "Удалить", "Upload": "Загрузить",
    "Confirm": "Подтвердить", "Back": "Назад", "Next": "Далее", "Send": "Отправить", "Print": "Печать", "View all": "Показать все",
    "Pending": "Ожидает", "Confirmed": "Подтверждён", "Checked in": "Прибыл", "Completed": "Завершён",
    "Cancelled": "Отменён", "No-show": "Не явился", "Unpaid": "Не оплачен", "Partially paid": "Частично оплачен",
    "Paid": "Оплачен", "Refunded": "Возврат", "Upcoming": "Предстоящие", "Past": "Прошедшие",
    "Find a doctor": "Найти врача", "Choose a time": "Выберите время", "Reason for visit": "Причина визита",
    "In person": "Очно", "Video visit": "Видеоприём", "Reschedule": "Перенести", "Add to calendar": "Добавить в календарь",
    "Join video visit": "Войти на видеоприём", "Visits": "Визиты", "Prescriptions": "Рецепты",
    "Lab & imaging": "Анализы и снимки", "Vaccinations": "Прививки", "Invoices": "Счета",
    "Insurance claims": "Страховые заявки", "Pay online": "Оплатить онлайн", "Receipt": "Квитанция", "Balance": "Остаток",
    "Personal information": "Личные данные", "Medical information": "Медицинские данные", "Insurance": "Страховка",
    "Emergency contact": "Экстренный контакт", "Language": "Язык", "Password": "Пароль", "Email": "Эл. почта",
    "Privacy & data": "Конфиденциальность и данные", "Two-factor authentication": "Двухфакторная аутентификация",
    "Notification preferences": "Настройки уведомлений", "New message": "Новое сообщение", "Subject": "Тема", "Message": "Сообщение",
    "Mark all read": "Отметить все прочитанными", "No notifications yet.": "Уведомлений пока нет.",
    "Welcome back": "С возвращением", "Next appointment": "Ближайший приём", "Profile completion": "Заполненность профиля",
    "Allergies": "Аллергии", "Chronic conditions": "Хронические заболевания", "Current medications": "Принимаемые лекарства",
    "Blood type": "Группа крови", "Date of birth": "Дата рождения", "Gender": "Пол", "Phone": "Телефон", "Address": "Адрес",
    "Skip to content": "Перейти к содержимому", "You will be signed out soon": "Сеанс скоро завершится",
    "Stay signed in": "Остаться в системе", "Accept and continue": "Принять и продолжить",
    "Privacy policy": "Политика конфиденциальности", "Download my data": "Скачать мои данные", "Request account deletion": "Запросить удаление аккаунта",
  },
};

export function translate(lang: Lang, en: string): string {
  return lang === "en" ? en : DICT[lang][en] ?? en;
}

/** `const t = useT(); t("Book appointment")` */
export function useT() {
  const lang = useLang((s) => s.lang);
  return (en: string) => translate(lang, en);
}

export const currentLocale = () => LANGS.find((l) => l.code === useLang.getState().lang)?.locale ?? "en-GB";
