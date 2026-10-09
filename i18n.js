'use strict';
/* ===== Translations. English is the fallback; the CrazyGames locale picks the language. ===== */
const I18N = {
  en: { play:"PLAY", garage:"GARAGE", missions:"MISSIONS", oneway:"One way", twoway:"Two way", best:"BEST", dist:"DISTANCE", score:"SCORE", speed:"SPEED", nos:"NITRO", combo:"COMBO", brake:"BRAKE", coins:"COINS",
    paused:"Paused", resume:"Resume", restart:"Restart", mainmenu:"Main menu", crashed:"Crashed!", newbest:"New best!", retry:"Try again", ad2x:"Watch ad: x2 coins", adfail:"Ad not available", select:"Select", selected:"Selected", buy:"Buy", need:"Not enough coins", upgrade:"Upgrade", maxed:"MAX",
    u_nitro:"Nitro tank", u_handling:"Handling", u_engine:"Engine", s_speed:"Speed", s_handling:"Handling", s_nitro:"Nitro", garage_title:"Garage", missions_title:"Missions", back:"Back",
    m_near:"Pull off {n} near misses", m_dist:"Drive {n} m in total", m_speed:"Reach {n} km/h", m_onc:"Drive {n} m in oncoming lanes", m_combo:"Reach a x{n} combo", m_coin:"Collect {n} coins",
    pop_near:"NEAR MISS", pop_onc:"ONCOMING", pop_combo:"COMBO LOST", pop_mission:"MISSION COMPLETE",
    c_move:"A / D or ◀ ▶  Steer", c_nitro:"SPACE or W  Nitro", c_brake:"S or ▼  Brake", c_pause:"P  Pause", c_touch:"Use the buttons on screen", earned:"Coins earned", lang:"Language" },
  tr: { play:"OYNA", garage:"GARAJ", missions:"GÖREVLER", oneway:"Tek yön", twoway:"Çift yön", best:"REKOR", dist:"MESAFE", score:"PUAN", speed:"HIZ", nos:"NİTRO", combo:"KOMBO", brake:"FREN", coins:"PARA",
    paused:"Duraklatıldı", resume:"Devam et", restart:"Yeniden başlat", mainmenu:"Ana menü", crashed:"Çarptın!", newbest:"Yeni rekor!", retry:"Tekrar dene", ad2x:"Reklam izle: x2 para", adfail:"Reklam şu an yok", select:"Seç", selected:"Seçili", buy:"Satın al", need:"Yetersiz para", upgrade:"Geliştir", maxed:"MAKS",
    u_nitro:"Nitro deposu", u_handling:"Yol tutuş", u_engine:"Motor", s_speed:"Hız", s_handling:"Yol tutuş", s_nitro:"Nitro", garage_title:"Garaj", missions_title:"Görevler", back:"Geri",
    m_near:"{n} kez ucuz kurtul", m_dist:"Toplam {n} m yol yap", m_speed:"{n} km/s hıza ulaş", m_onc:"Ters şeritte {n} m git", m_combo:"x{n} kombo yap", m_coin:"{n} para topla",
    pop_near:"UCUZ KURTULDUN", pop_onc:"TERS ŞERİT", pop_combo:"KOMBO BİTTİ", pop_mission:"GÖREV TAMAM",
    c_move:"A / D veya ◀ ▶  Direksiyon", c_nitro:"BOŞLUK veya W  Nitro", c_brake:"S veya ▼  Fren", c_pause:"P  Duraklat", c_touch:"Ekrandaki tuşları kullan", earned:"Kazanılan para", lang:"Dil" },
  es: { play:"JUGAR", garage:"GARAJE", missions:"MISIONES", oneway:"Un sentido", twoway:"Doble sentido", best:"MÁXIMO", dist:"DISTANCIA", score:"PUNTOS", speed:"VELOCIDAD", nos:"NITRO", combo:"COMBO", brake:"FRENO", coins:"MONEDAS",
    paused:"Pausa", resume:"Reanudar", restart:"Reiniciar", mainmenu:"Menú principal", crashed:"¡Chocaste!", newbest:"¡Nuevo récord!", retry:"Reintentar", ad2x:"Ver anuncio: x2 monedas", adfail:"Anuncio no disponible", select:"Elegir", selected:"Elegido", buy:"Comprar", need:"Monedas insuficientes", upgrade:"Mejorar", maxed:"MÁX",
    u_nitro:"Depósito de nitro", u_handling:"Manejo", u_engine:"Motor", s_speed:"Velocidad", s_handling:"Manejo", s_nitro:"Nitro", garage_title:"Garaje", missions_title:"Misiones", back:"Atrás",
    m_near:"Haz {n} casi-choques", m_dist:"Conduce {n} m en total", m_speed:"Alcanza {n} km/h", m_onc:"Conduce {n} m en sentido contrario", m_combo:"Consigue un combo x{n}", m_coin:"Recoge {n} monedas",
    pop_near:"¡POR POCO!", pop_onc:"CONTRAMANO", pop_combo:"COMBO PERDIDO", pop_mission:"MISIÓN CUMPLIDA",
    c_move:"A / D o ◀ ▶  Girar", c_nitro:"ESPACIO o W  Nitro", c_brake:"S o ▼  Freno", c_pause:"P  Pausa", c_touch:"Usa los botones de la pantalla", earned:"Monedas ganadas", lang:"Idioma" },
  ru: { play:"ИГРАТЬ", garage:"ГАРАЖ", missions:"ЗАДАНИЯ", oneway:"Одна сторона", twoway:"Встречная", best:"РЕКОРД", dist:"ДИСТАНЦИЯ", score:"ОЧКИ", speed:"СКОРОСТЬ", nos:"НИТРО", combo:"КОМБО", brake:"ТОРМОЗ", coins:"МОНЕТЫ",
    paused:"Пауза", resume:"Продолжить", restart:"Рестарт", mainmenu:"Меню", crashed:"Авария!", newbest:"Новый рекорд!", retry:"Ещё раз", ad2x:"Реклама: x2 монеты", adfail:"Реклама недоступна", select:"Выбрать", selected:"Выбрано", buy:"Купить", need:"Не хватает монет", upgrade:"Улучшить", maxed:"МАКС",
    u_nitro:"Бак нитро", u_handling:"Управляемость", u_engine:"Двигатель", s_speed:"Скорость", s_handling:"Управл.", s_nitro:"Нитро", garage_title:"Гараж", missions_title:"Задания", back:"Назад",
    m_near:"Сделайте {n} близких проездов", m_dist:"Проедьте {n} м всего", m_speed:"Разгонитесь до {n} км/ч", m_onc:"Проедьте {n} м по встречной", m_combo:"Достигните комбо x{n}", m_coin:"Соберите {n} монет",
    pop_near:"ВПРИТИРКУ!", pop_onc:"ВСТРЕЧКА", pop_combo:"КОМБО СБРОШЕНО", pop_mission:"ЗАДАНИЕ ВЫПОЛНЕНО",
    c_move:"A / D или ◀ ▶  Руль", c_nitro:"ПРОБЕЛ или W  Нитро", c_brake:"S или ▼  Тормоз", c_pause:"P  Пауза", c_touch:"Используйте кнопки на экране", earned:"Заработано монет", lang:"Язык" },
  zh: { play:"开始", garage:"车库", missions:"任务", oneway:"单向", twoway:"双向", best:"最高分", dist:"距离", score:"得分", speed:"速度", nos:"氮气", combo:"连击", brake:"刹车", coins:"金币",
    paused:"已暂停", resume:"继续", restart:"重新开始", mainmenu:"主菜单", crashed:"撞车了！", newbest:"新纪录！", retry:"再试一次", ad2x:"看广告：金币x2", adfail:"暂无广告", select:"选择", selected:"已选择", buy:"购买", need:"金币不足", upgrade:"升级", maxed:"满级",
    u_nitro:"氮气罐", u_handling:"操控", u_engine:"引擎", s_speed:"速度", s_handling:"操控", s_nitro:"氮气", garage_title:"车库", missions_title:"任务", back:"返回",
    m_near:"完成{n}次惊险避让", m_dist:"累计行驶{n}米", m_speed:"达到{n}公里/时", m_onc:"在逆行车道行驶{n}米", m_combo:"达成x{n}连击", m_coin:"收集{n}枚金币",
    pop_near:"惊险避让！", pop_onc:"逆行", pop_combo:"连击中断", pop_mission:"任务完成",
    c_move:"A / D 或 ◀ ▶  转向", c_nitro:"空格键或 W  氮气", c_brake:"S 或 ▼  刹车", c_pause:"P  暂停", c_touch:"使用屏幕上的按钮", earned:"获得金币", lang:"语言" }
};
let LANG = 'en';
function T(k, vars) {
  let s = (I18N[LANG] && I18N[LANG][k]) || I18N.en[k] || k;
  if (vars) for (const v in vars) s = s.replace('{' + v + '}', vars[v]);
  return s;
}
function applyLang() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i]').forEach(el => { el.textContent = T(el.getAttribute('data-i')); });
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.l === LANG));
}
