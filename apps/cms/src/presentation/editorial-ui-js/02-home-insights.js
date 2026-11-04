  const homeInsights = () => {
    const groups = window.LVD_CATALOG_SOURCE?.groups || [];
    const total = groups.reduce((sum, group) => sum + group.titles.length, 0);
    const number = value => new Intl.NumberFormat(window.LVD_I18N?.get() === 'de' ? 'de-DE' : 'vi-VN').format(value);
    return `<section class="pm-home-metrics" aria-label="${l('Thư viện Luật Việt Đức','Die Rechtsbibliothek')}"><div class="container pm-metrics-grid">
      <div><strong>02</strong><span>${l('Việt Nam & Đức','Vietnam & Deutschland')}</span></div>
      <div><strong>${number(groups.length)}</strong><span>${l('Lĩnh vực pháp luật','Rechtsgebiete')}</span></div>
      <div><strong>${number(total)}</strong><span>${l('Chủ đề trong thư viện','Themen in der Bibliothek')}</span></div>
    </div></section>`;
  };
  const homeTopicMap = () => {
    const items = [
      ['Kết hôn','Heiraten','hon-nhan-gia-dinh',24,18,'large'],
      ['Quốc tịch','Staatsangehörigkeit','quoc-tich',62,15,'large'],
      ['Giấy tờ cá nhân','Persönliche Dokumente','giay-to-tuy-than',85,34,'small'],
      ['Mua bán nhà đất','Immobilien kaufen','nha-o-dat-dai',15,39,'small'],
      ['Cư trú tại Đức','Aufenthalt in Deutschland','xuat-nhap-canh-cu-tru',38,42,'large'],
      ['Hợp đồng','Verträge','hop-dong-giao-dich-dan-su',77,59,'large'],
      ['Thừa kế','Erben','thua-ke',15,77,'small'],
      ['Đi làm','Arbeiten','lao-dong-viec-lam-bhxh',33,86,'small'],
      ['Khai sinh cho con','Geburt eines Kindes','khai-sinh-ho-tich-giam-ho',56,79,'medium'],
      ['Kinh doanh','Unternehmen gründen','dau-tu-kinh-doanh-thuong-mai',82,87,'small'],
      ['Thuế','Steuern','thue',91,68,'small']
    ];
    return `<section class="pm-topic-map" aria-labelledby="pm-topic-map-title"><div class="container"><header><h2 id="pm-topic-map-title">${l('Pháp luật trong đời sống','Recht im Alltag')}</h2></header><div class="pm-topic-network">
      <svg class="pm-network-lines" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">${items.map(item => `<path d="M500 260 L${item[3]*10} ${item[4]*5}"/>`).join('')}</svg>
      <span class="pm-network-hub" aria-hidden="true"><i></i><span>Luật Việt Đức</span></span>
      ${items.map(([vi,de,id,x,y,size]) => `<a class="pm-network-node pm-network-node--${size}" style="--node-x:${x}%;--node-y:${y}%" href="#/chu-de/${id}"><span>${l(vi,de)}</span><span class="pm-network-arrow" aria-hidden="true">↗</span></a>`).join('')}
    </div></div></section>`;
  };
