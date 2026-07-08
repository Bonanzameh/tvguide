function tvChannel(number, id, name, group, options = {}) {
  return {
    number,
    id,
    name,
    group,
    aliases: options.aliases || [],
    xmltvIds: options.xmltvIds || [],
    pickxIds: options.pickxIds || []
  }
}

// Ordered from the Orange Belgium Flanders channel sheet:
// /Users/nbaugniet/Downloads/OTH_2510086_OBE_Flandre_NL.pdf
export const defaultChannels = [
  tvChannel(1, 'vtm', 'VTM', 'Flanders', {
    aliases: ['VTM HD'],
    xmltvIds: ['VTM.be', 'VTM.be@SD', 'VTM.be@HD'],
    pickxIds: ['UID50297', 'UID50040']
  }),
  tvChannel(2, 'vrt-1', 'VRT 1', 'Flanders', {
    aliases: ['VRT1', 'Eén', 'VRT 1 HD'],
    xmltvIds: ['VRT1.be', 'VRT1.be@SD', 'VRT1.be@HD'],
    pickxIds: ['UID50208', 'UID50037']
  }),
  tvChannel(3, 'vrt-canvas', 'VRT Canvas', 'Flanders', {
    aliases: ['Canvas', 'VRT CANVAS', 'VRT Canvas HD'],
    xmltvIds: ['VRTCanvas.be', 'VRTCanvas.be@SD', 'Canvas.be'],
    pickxIds: ['UID50306', 'UID50084']
  }),
  tvChannel(4, 'play', 'Play', 'Flanders', {
    aliases: ['Play4', 'Play HD', 'Play4 HD'],
    xmltvIds: ['Play4.be', 'Play4.be@SD', 'Play4.be@HD'],
    pickxIds: ['UID2120', 'UID50083']
  }),
  tvChannel(5, 'vtm-2', 'VTM 2', 'Flanders', {
    aliases: ['VTM2', 'VTM 2 HD'],
    xmltvIds: ['VTM2.be', 'VTM2.be@SD', 'VTM2.be@HD'],
    pickxIds: ['UID0039', 'UID50044']
  }),
  tvChannel(6, 'play-fiction', 'Play Fiction', 'Flanders', {
    aliases: ['Play Fictie', 'Play5', 'Play5 HD'],
    xmltvIds: ['Play5.be', 'Play5.be@SD', 'Play5.be@HD'],
    pickxIds: ['UID2121', 'UID50066']
  }),
  tvChannel(7, 'vtm-3', 'VTM 3', 'Flanders', {
    aliases: ['VTM3', 'VTM 3 HD'],
    xmltvIds: ['VTM3.be', 'VTM3.be@SD', 'VTM3.be@HD'],
    pickxIds: ['UID0155', 'UID50082']
  }),
  tvChannel(8, 'vtm-4', 'VTM 4', 'Flanders', {
    aliases: ['VTM4', 'VTM 4 HD'],
    xmltvIds: ['VTM4.be', 'VTM4.be@SD'],
    pickxIds: ['UID2073', 'UID50301']
  }),
  tvChannel(9, 'play-action', 'Play Action', 'Flanders', {
    aliases: ['Play Actie', 'Play6', 'Play6 HD'],
    xmltvIds: ['Play6.be', 'Play6.be@SD', 'Play6.be@HD'],
    pickxIds: ['UID0147', 'UID0146']
  }),
  tvChannel(10, 'discovery-nl', 'Discovery NL', 'Documentary', {
    aliases: ['Disc HD N', 'Discovery N', 'Discovery Channel'],
    xmltvIds: ['DiscoveryChannel.nl', 'DiscoveryChannel.nl@HD', 'DiscoveryChannel.be'],
    pickxIds: ['UID50199', 'UID50017']
  }),
  tvChannel(11, 'nat-geo', 'Nat Geo', 'Documentary', {
    aliases: ['NGC N', 'NGC HD N', 'National Geographic'],
    xmltvIds: ['NationalGeographic.nl', 'NationalGeographic.fr', 'NationalGeographic.fr@SD'],
    pickxIds: ['UID2061', 'UID50087']
  }),
  tvChannel(12, 'ketnet', 'Ketnet', 'Kids', {
    aliases: ['KETNET', 'Ketnet HD'],
    xmltvIds: ['Ketnet.be', 'Ketnet.be@SD', 'Ketnet.be@HD'],
    pickxIds: ['UID0248', 'UID50310']
  }),
  tvChannel(13, 'local-tv', 'Main Local TV Channel', 'Local', {
    aliases: ['Regional TV', 'RegInfo N'],
    xmltvIds: [],
    pickxIds: ['UID50309']
  }),
  tvChannel(14, 'nat-geo-wild', 'Nat Geo Wild', 'Documentary', {
    aliases: ['NGC Wild N', 'National Geographic Wild'],
    xmltvIds: ['NationalGeographicWild.nl', 'NationalGeographicWild.fr'],
    pickxIds: ['UID0023', 'UID0246']
  }),
  tvChannel(15, 'star-channel', 'STAR Channel', 'Entertainment', {
    aliases: ['STAR Channel HD'],
    xmltvIds: ['STARChannel.be', 'StarChannel.be'],
    pickxIds: ['UID0142']
  }),
  tvChannel(16, 'tlc', 'TLC', 'Entertainment', {
    aliases: [],
    xmltvIds: ['TLC.nl', 'TLC.nl@SD'],
    pickxIds: ['UID2173']
  }),
  tvChannel(17, 'play-reality', 'Play Reality', 'Flanders', {
    aliases: ['Play Reality HD'],
    xmltvIds: ['Play7.be', 'Play7.be@SD'],
    pickxIds: ['UID2293']
  }),
  tvChannel(18, 'comedy-central', 'Comedy Central', 'Entertainment', {
    aliases: ['Comedy Central N', 'Comedy Central N HD'],
    xmltvIds: ['ComedyCentral.nl', 'ComedyCentral.nl@HD'],
    pickxIds: ['UID2376', 'UID50144']
  }),
  tvChannel(19, 'vtm-gold', 'VTM Gold', 'Flanders', {
    aliases: ['VTM GOLD'],
    xmltvIds: ['VTMGold.be', 'VTMGold.be@SD'],
    pickxIds: ['UID0313']
  }),
  tvChannel(21, 'npo-1', 'NPO 1', 'Netherlands', {
    aliases: ['NPO1', 'NPO 1 HD'],
    xmltvIds: ['NPO1.nl', 'NPO1.nl@SD', 'NPO1.nl@HD'],
    pickxIds: ['UID0256', 'UID50047']
  }),
  tvChannel(22, 'npo-2', 'NPO 2', 'Netherlands', {
    aliases: ['NPO2', 'NPO 2 HD'],
    xmltvIds: ['NPO2.nl', 'NPO2.nl@SD', 'NPO2.nl@HD'],
    pickxIds: ['UID0257', 'UID50080']
  }),
  tvChannel(23, 'npo-3', 'NPO 3', 'Netherlands', {
    aliases: ['NPO3', 'NPO 3 HD'],
    xmltvIds: ['NPO3.nl', 'NPO3.nl@SD', 'NPO3.nl@HD'],
    pickxIds: ['UID0258', 'UID50079']
  }),
  tvChannel(24, 'mtv-nl', 'MTV NL', 'Music', {
    aliases: ['MTV N', 'MTV N HD'],
    xmltvIds: ['MTV.nl', 'MTV.fr', 'MTV.fr@SD'],
    pickxIds: ['UID2472', 'UID50143']
  }),
  tvChannel(25, 'vtm-xmas', 'VTM Xmas', 'Seasonal', {
    aliases: ['VTM Christmas'],
    xmltvIds: [],
    pickxIds: []
  }),
  tvChannel(26, 'njam', 'Njam!', 'Lifestyle', {
    aliases: ['Njam'],
    xmltvIds: ['Njam.be', 'Njam.be@SD', 'Njam.be@HD'],
    pickxIds: ['UID0232', 'UID0234']
  }),
  tvChannel(27, 'dobbit', 'DOBBIT TV', 'Lifestyle', {
    aliases: ['Dobbit TV N', 'Dobbit N HD'],
    xmltvIds: ['DobbitTV.be', 'DobbitTV.be@NL'],
    pickxIds: ['UID2374', 'UID0037']
  }),
  tvChannel(28, 'plattelands', 'Plattelands TV', 'Lifestyle', {
    aliases: ['Plattelands'],
    xmltvIds: ['PlattelandsTV.be', 'PlattelandsTV.be@SD'],
    pickxIds: ['UID0062']
  }),
  tvChannel(30, 'eurosport', 'Eurosport', 'Sport', {
    aliases: ['Eurosp HD N', 'Eurosport 1'],
    xmltvIds: ['Eurosport1.nl', 'Eurosport1.fr', 'Eurosport1.fr@France'],
    pickxIds: ['UID50210', 'UID50094']
  }),
  tvChannel(31, 'eurosport-2', 'Eurosport 2', 'Sport', {
    aliases: ['Eurosport2', 'Eurosport 2 HD'],
    xmltvIds: ['Eurosport2.nl', 'Eurosport2.fr'],
    pickxIds: ['UID2358', 'UID50269']
  }),
  tvChannel(38, 'sport-10', 'Sport 10', 'Sport', {
    aliases: ['Sport 10 HD'],
    xmltvIds: ['Sport10.be'],
    pickxIds: ['UID50201', 'UID2059']
  }),
  tvChannel(39, 'w-sport', 'W. Sport', 'Sport', {
    aliases: ['Women Sports'],
    xmltvIds: [],
    pickxIds: ['UID2366']
  }),
  tvChannel(51, 'nick-jr', 'Nick Jr', 'Kids', {
    aliases: ['nick jr N'],
    xmltvIds: ['NickJr.nl', 'NickJr.nl@SD'],
    pickxIds: ['UID50153']
  }),
  tvChannel(52, 'studio-100', 'Studio 100 TV', 'Kids', {
    aliases: ['ST100TV', 'Studio100 TV'],
    xmltvIds: ['Studio100TV.be'],
    pickxIds: ['UID2033']
  }),
  tvChannel(53, 'cartoonito', 'Cartoonito', 'Kids', {
    aliases: ['Cartoonito HD'],
    xmltvIds: ['Cartoonito.uk', 'Cartoonito.nl'],
    pickxIds: ['UID2360', 'UID50305']
  }),
  tvChannel(54, 'disney-nl', 'Disney NL', 'Kids', {
    aliases: ['Disney Channel NL', 'Disney Channel'],
    xmltvIds: ['DisneyChannel.nl', 'DisneyChannel.fr'],
    pickxIds: []
  }),
  tvChannel(55, 'disney-jr', 'Disney Jr', 'Kids', {
    aliases: ['Disney Jr. N'],
    xmltvIds: ['DisneyJunior.nl', 'DisneyJunior.fr'],
    pickxIds: ['UID0080']
  }),
  tvChannel(56, 'nickelodeon', 'Nickelodeon', 'Kids', {
    aliases: ['nick N HD', 'nick N'],
    xmltvIds: ['Nickelodeon.nl', 'Nickelodeon.nl@HD'],
    pickxIds: ['UID0135', 'UID50039']
  }),
  tvChannel(57, 'cartoon-network', 'Cartoon Network', 'Kids', {
    aliases: ['Cartoon N HD', 'Cartoon N'],
    xmltvIds: ['CartoonNetwork.nl', 'CartoonNetworkCEE.uk', 'CartoonNetworkCEE.uk@France'],
    pickxIds: ['UID2362', 'UID50022']
  }),
  tvChannel(58, 'eclips', 'Eclips TV', 'Flanders', {
    aliases: ['Eclips'],
    xmltvIds: ['EclipsTV.be', 'EclipsTV.be@SD'],
    pickxIds: ['UID0211']
  }),
  tvChannel(59, 'out-tv', 'OUT TV', 'Lifestyle', {
    aliases: ['OUT tv'],
    xmltvIds: ['OUTtv.nl', 'OUTtv.nl@SD'],
    pickxIds: ['UID0307']
  }),
  tvChannel(60, 'xite', 'xite', 'Music', {
    aliases: ['XITE'],
    xmltvIds: ['Xite.nl'],
    pickxIds: []
  }),
  tvChannel(61, 'q-music-tv', 'Q-music', 'Music', {
    aliases: ['Q-Music Kijk Live'],
    xmltvIds: ['QmusicVlaanderen.be', 'QmusicVlaanderen.be@SD'],
    pickxIds: ['UID2353']
  }),
  tvChannel(62, 'mentpop', 'MENTpop', 'Music', {
    aliases: ['MENT pop'],
    xmltvIds: ['MENTpop.be'],
    pickxIds: []
  }),
  tvChannel(63, 'ment55', 'MENT55', 'Music', {
    aliases: ['Ment55', 'Ment55 HD'],
    xmltvIds: ['MENT55.be'],
    pickxIds: ['UID2349', 'UID50319']
  }),
  tvChannel(80, 'vlaamsparlement', 'Vlaamsparlement.TV', 'Public', {
    aliases: ['Vlaams Parlement TV', 'Vlaamsparlement.tv'],
    xmltvIds: ['VlaamsParlementTV.be'],
    pickxIds: ['UID1102']
  }),
  tvChannel(83, 'euronews', 'Euronews', 'News', {
    aliases: ['Euronews EN'],
    xmltvIds: ['EuronewsEnglish.fr', 'EuronewsFrench.fr'],
    pickxIds: ['UID2488', 'UID50085']
  }),
  tvChannel(84, 'bbc-news', 'BBC News', 'News', {
    aliases: ['BBC World News'],
    xmltvIds: ['BBCNews.uk', 'BBCWorldNews.uk'],
    pickxIds: ['UID2481', 'UID50069']
  }),
  tvChannel(85, 'cnn', 'CNN', 'News', {
    aliases: ['CNN International'],
    xmltvIds: ['CNNInternational.us', 'CNNInternationalEurope.us'],
    pickxIds: ['UID2056', 'UID50032']
  }),
  tvChannel(86, 'al-jazeera', 'Al Jazeera EN', 'News', {
    aliases: ['Al Jazeera English'],
    xmltvIds: ['AlJazeeraEnglish.qa'],
    pickxIds: ['UID2475', 'UID50162']
  }),
  tvChannel(91, 'lci', 'LCI', 'News', {
    aliases: ['LCI HD'],
    xmltvIds: ['LCI.fr', 'LCI.fr@SD'],
    pickxIds: ['UID2377', 'UID50067']
  }),
  tvChannel(96, 'trends-z', 'Trends Z', 'Business', {
    aliases: ['Trends Z N', 'Trends Z N HD'],
    xmltvIds: ['TrendsZ.be'],
    pickxIds: ['UID2049', 'UID50034']
  }),
  tvChannel(101, 'la-une', 'La Une', 'French', {
    aliases: ['LA UNE (RTBF)', 'RTBF La Une', 'La Une HD'],
    xmltvIds: ['LaUne.be', 'LaUne.be@SD', 'LaUne.be@HD'],
    pickxIds: ['UID50323', 'UID50060']
  }),
  tvChannel(102, 'tipik', 'Tipik', 'French', {
    aliases: ['TIPIK', 'TIPIK HD', 'RTBF Tipik TV'],
    xmltvIds: ['Tipik.be', 'Tipik.be@HD'],
    pickxIds: ['UID0047', 'UID50059']
  }),
  tvChannel(103, 'la-trois', 'La Trois', 'French', {
    aliases: ['RTBF La Trois', 'La Trois HD'],
    xmltvIds: ['LaTrois.be', 'LaTrois.be@SD'],
    pickxIds: ['UID50334', 'UID50302']
  }),
  tvChannel(104, 'rtl-tvi', 'RTL tvi', 'French', {
    aliases: ['RTLTVI', 'RTL tvi HD'],
    xmltvIds: ['RTLTVI.be', 'RTLTVI.be@SD', 'RTLTVI.be@HD'],
    pickxIds: ['UID0102', 'UID50072']
  }),
  tvChannel(105, 'rtl-club', 'RTL club', 'French', {
    aliases: ['Club RTL', 'RTL Club', 'RTL club HD'],
    xmltvIds: ['RTLClub.be', 'ClubRTL.be'],
    pickxIds: ['UID50209', 'UID50070']
  }),
  tvChannel(106, 'rtl-plug', 'RTL plug', 'French', {
    aliases: ['Plug RTL', 'RTL Plug', 'RTL plug HD'],
    xmltvIds: ['RTLPlug.be', 'PlugRTL.be'],
    pickxIds: ['UID0106', 'UID50026']
  }),
  tvChannel(107, 'tf1', 'TF1', 'French', {
    aliases: ['TF1 HD'],
    xmltvIds: ['TF1.fr', 'TF1.fr@SD', 'TF1.fr@HD'],
    pickxIds: ['UID50190', 'UID50068']
  }),
  tvChannel(108, 'france-2', 'France 2', 'French', {
    aliases: ['FRANCE 2', 'France 2 HD'],
    xmltvIds: ['France2.fr', 'France2.fr@SD', 'France2.fr@HD'],
    pickxIds: ['UID50211', 'UID50088']
  }),
  tvChannel(109, 'france-3', 'France 3', 'French', {
    aliases: ['FRANCE 3', 'France 3 HD'],
    xmltvIds: ['France3.fr', 'France3.fr@SD', 'France3.fr@HD'],
    pickxIds: ['UID0308', 'UID50089']
  }),
  tvChannel(110, 'tv-breizh', 'TV Breizh', 'French', {
    aliases: ['TV Breizh HD'],
    xmltvIds: ['TVBreizh.fr', 'TVBreizh.fr@SD'],
    pickxIds: ['UID2051', 'UID50012']
  }),
  tvChannel(112, 'arte', 'Arte', 'French', {
    aliases: ['ARTE', 'arte HD'],
    xmltvIds: ['arte.fr', 'arte.fr@SD', 'arte.fr@HD'],
    pickxIds: ['UID0239', 'UID50018']
  }),
  tvChannel(114, 'ab3', 'AB3', 'French', {
    aliases: ['AB3 HD'],
    xmltvIds: ['AB3.be', 'AB3.be@SD', 'AB3.be@HD'],
    pickxIds: ['UID0084', 'UID50058']
  }),
  tvChannel(115, 'tv5-monde', 'TV5 Monde', 'French', {
    aliases: ['TV5 MONDE', 'TV5 Monde HD'],
    xmltvIds: ['TV5MondeFranceBelgiumSwitzerlandMonaco.fr'],
    pickxIds: ['UID2065', 'UID50030']
  }),
  tvChannel(116, 'ln24', 'LN24', 'News', {
    aliases: ['LN24 HD'],
    xmltvIds: ['LN24.be', 'LN24.be@SD'],
    pickxIds: ['UID0311']
  }),
  tvChannel(119, 'tmc', 'TMC', 'French', {
    aliases: ['TMC HD'],
    xmltvIds: ['TMC.fr', 'TMC.fr@SD'],
    pickxIds: ['UID2276']
  }),
  tvChannel(121, 'discovery-fr', 'Discovery', 'Documentary', {
    aliases: ['Discovery F', 'Disc HD F'],
    xmltvIds: ['DiscoveryChannel.fr', 'DiscoveryChannel.fr@SD', 'DiscoveryChannel.be'],
    pickxIds: ['UID0091', 'UID0090']
  }),
  tvChannel(124, 'france-4', 'France 4', 'French', {
    aliases: ['FRANCE 4', 'France 4 HD'],
    xmltvIds: ['France4.fr', 'France4.fr@HD'],
    pickxIds: ['UID0309', 'UID50081']
  }),
  tvChannel(125, 'france-5', 'France 5', 'French', {
    aliases: ['FRANCE 5', 'France 5 HD'],
    xmltvIds: ['France5.fr', 'France5.fr@SD', 'France5.fr@HD'],
    pickxIds: ['UID0310', 'UID50038']
  }),
  tvChannel(127, 'rtl-district', 'RTL District', 'French', {
    aliases: ['RTL district HD'],
    xmltvIds: ['RTLDistrict.be'],
    pickxIds: ['UID2553']
  }),
  tvChannel(181, 'ard', 'ARD', 'International', {
    aliases: ['Das Erste'],
    xmltvIds: ['DasErste.de', 'DasErste.de@SD'],
    pickxIds: ['UID2375', 'UID0024']
  }),
  tvChannel(182, 'zdf', 'ZDF', 'International', {
    aliases: ['ZDF HD'],
    xmltvIds: ['ZDF.de', 'ZDF.de@SD'],
    pickxIds: ['UID2379', 'UID0030']
  }),
  tvChannel(191, 'bbc-one', 'BBC 1', 'International', {
    aliases: ['BBC One', 'BBC1'],
    xmltvIds: ['BBCOne.uk'],
    pickxIds: ['UID2355', 'UID50071']
  }),
  tvChannel(192, 'bbc-two', 'BBC 2', 'International', {
    aliases: ['BBC Two', 'BBC2'],
    xmltvIds: ['BBCTwo.uk'],
    pickxIds: ['UID2356', 'UID50295']
  }),
  tvChannel(193, 'bbc-first', 'BBC First', 'International', {
    aliases: ['BBC First'],
    xmltvIds: ['BBCFirst.uk', 'BBCFirst.uk@Benelux'],
    pickxIds: ['UID0132']
  }),
  tvChannel(231, 'tve', 'TVE', 'International', {
    aliases: ['TVE Int', 'TVE International'],
    xmltvIds: ['TVEInternacionalEuropa.es'],
    pickxIds: ['UID2483', 'UID50027']
  }),
  tvChannel(261, 'trt', 'TRT', 'International', {
    aliases: ['TRT Türk'],
    xmltvIds: ['TRTTurk.tr'],
    pickxIds: ['UID50096']
  })
]
