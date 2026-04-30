export const CONTACT_EMAIL = 'rybazdesest@mail.ru';
export const CONTACT_PHONE_E164 = '+79993380337';
export const CONTACT_PHONE_DIGITS = '79993380337';
export const CONTACT_PHONE_DISPLAY = '+7 (999) 338-03-37';
export const YANDEX_VERIFICATION = 'ddd66544efcd5f28';
const GOOGLE_SITE_VERIFICATION_RAW = 'google-site-verification=iw12mesp8aSA1AHFPcD_pjBo2n14Qnb7DypBypXnKLs';
export const GOOGLE_SITE_VERIFICATION = GOOGLE_SITE_VERIFICATION_RAW.replace(
  /^google-site-verification=/,
  ''
);
export const BUSINESS_NAME = 'Рыба здесь - есть!';
export const CONTACT_CITY = 'Нахабино';
export const CONTACT_STREET = 'ул. Володарского 3Б';
export const CONTACT_COUNTRY = 'RU';
export const CONTACT_LAT = 55.859353;
export const CONTACT_LON = 37.18264;
export const CONTACT_ADDRESS_LINE = `${CONTACT_CITY}, ${CONTACT_STREET}`;
export const CONTACT_YANDEX_MAP_URL = `https://yandex.ru/maps/?ll=${CONTACT_LON}%2C${CONTACT_LAT}&z=17&pt=${CONTACT_LON},${CONTACT_LAT},pm2blm&text=Нахабино%20улица%20Володарского%203Б`;

export const CONTACT_WHATSAPP_URL = `https://wa.me/${CONTACT_PHONE_DIGITS}`;
export const CONTACT_TELEGRAM_URL = `tg://resolve?phone=${CONTACT_PHONE_DIGITS}`;
export const CONTACT_MAX_URL = `https://max.ru/+${CONTACT_PHONE_DIGITS}`;
