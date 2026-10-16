// =====================================================
// LOCATION DATA (State -> District -> City/Town)
// =====================================================
// Common file for User Details screens and Route screens.
//
// User Details lo:
//   1. State select cheyagane -> District options automatic
//      ga vaati state ki sambandhinchina vatini chupistayi.
//   2. District select cheyagane -> City/Town options
//      automatic ga aa district ki sambandhinchina vatini
//      chupistayi.
//   3. Options anni UNIQUE ga untayi (duplicate names
//      raavu).
//
// Route screen lo:
//   User details lo ichina State, District, City/Town base
//   chesukoni From Stop / To Stop options automatic ga
//   unique ga vastayi.
// =====================================================


// ========================================
// ANDHRA PRADESH (26 Districts)
// ========================================

const LOCATION_DATA_ANDHRA = {

    "Alluri Sitharama Raju": ["Paderu", "Araku Valley", "Rampachodavaram"],

    "Anakapalli": ["Anakapalle", "Atchutapuram", "Chodavaram", "Elamanchili", "Narsipatnam", "Payakaraopeta"],

    "Ananthapuramu": ["Ananthapuramu", "Tadipatri", "Guntakal", "Uravakonda"],

    "Annamayya": ["Rajampet", "Rayachoti", "Thamballapalle"],

    "Bapatla": ["Bapatla", "Chirala", "Parchur"],

    "Chittoor": ["Chittoor", "Palamaner", "Kuppam", "Bangarupalem"],

    "Dr. B.R. Ambedkar Konaseema": ["Amalapuram", "Ravulapalem", "Mummidivaram", "Kothapeta"],

    "East Godavari": ["Rajahmundry", "Kadiyam", "Korukonda", "Rajanagaram"],

    "Eluru": ["Eluru", "Nuzvid", "Jangareddigudem", "Dwaraka Tirumala"],

    "Guntur": ["Guntur", "Tenali", "Ponnur", "Sattenapalli"],

    "Kakinada": ["Kakinada", "Pithapuram", "Gollaprolu", "Peddapuram"],

    "Krishna": ["Machilipatnam", "Gudivada", "Vuyyuru", "Gannavaram"],

    "Kurnool": ["Kurnool", "Adoni", "Yemmiganur", "Pathikonda"],

    "Nandyal": ["Nandyal", "Dhone", "Atmakur", "Banaganapalle"],

    "Nellore": ["Nellore", "Kavali", "Gudur", "Kovur"],

    "NTR": ["Vijayawada", "Nandigama", "Jaggaiahpet", "Ibrahimpatnam"],

    "Palnadu": ["Narasaraopet", "Macherla", "Vinukonda", "Gurazala"],

    "Parvathipuram Manyam": ["Parvathipuram", "Bobbili", "Salur"],

    "Prakasam": ["Ongole", "Markapur", "Kandukur", "Chimakurthy"],

    "Sri Sathya Sai": ["Puttaparthi", "Dharmavaram", "Kadiri", "Hindupur"],

    "Srikakulam": ["Srikakulam", "Tekkali", "Amadalavalasa", "Palasa"],

    "Tirupati": ["Tirupati", "Srikalahasti", "Chandragiri", "Renigunta"],

    "Visakhapatnam": ["Visakhapatnam", "Gajuwaka", "Bheemunipatnam", "Pendurthi"],

    "Vizianagaram": ["Vizianagaram", "Nellimarla", "Gajapathinagaram", "Cheepurupalli"],

    "West Godavari": ["Bhimavaram", "Tadepalligudem", "Tanuku", "Narsapur", "Palacole"],

    "YSR Kadapa": ["Kadapa", "Proddatur", "Pulivendula", "Jammalamadugu"]

};


// ========================================
// TELANGANA (33 Districts)
// ========================================

const LOCATION_DATA_TELANGANA = {

    "Adilabad": ["Adilabad", "Utnoor", "Ichoda"],

    "Bhadradri Kothagudem": ["Kothagudem", "Palwancha", "Yellandu"],

    "Hanumakonda": ["Hanumakonda", "Kazipet"],

    "Hyderabad": ["Hyderabad", "Secunderabad"],

    "Jagtial": ["Jagtial", "Korutla", "Metpalle"],

    "Jangaon": ["Jangaon", "Ghanpur"],

    "Jayashankar Bhupalpally": ["Bhupalpally", "Chityal"],

    "Jogulamba Gadwal": ["Gadwal", "Ieeja"],

    "Kamareddy": ["Kamareddy", "Banswada", "Yellareddy"],

    "Karimnagar": ["Karimnagar", "Huzurabad", "Jammikunta"],

    "Khammam": ["Khammam", "Sathupalli", "Wyra"],

    "Komaram Bheem Asifabad": ["Asifabad", "Kagaznagar"],

    "Mahabubabad": ["Mahabubabad", "Dornakal"],

    "Mahabubnagar": ["Mahabubnagar", "Jadcherla", "Bhoothpur"],

    "Mancherial": ["Mancherial", "Bellampalle", "Mandamarri"],

    "Medak": ["Medak", "Ramayampet", "Toopran"],

    "Medchal-Malkajgiri": ["Medchal", "Kompally", "Shamirpet"],

    "Mulugu": ["Mulugu", "Venkatapur"],

    "Nagarkurnool": ["Nagarkurnool", "Achampet", "Kalwakurthy"],

    "Nalgonda": ["Nalgonda", "Devarakonda", "Nakrekal"],

    "Narayanpet": ["Narayanpet", "Kosgi"],

    "Nirmal": ["Nirmal", "Bhainsa", "Khanapur"],

    "Nizamabad": ["Nizamabad", "Bodhan", "Armur"],

    "Peddapalli": ["Peddapalli", "Ramagundam", "Manthani"],

    "Rajanna Sircilla": ["Sircilla", "Vemulawada"],

    "Rangareddy": ["Shamshabad", "Ibrahimpatnam", "Hayathnagar"],

    "Sangareddy": ["Sangareddy", "Patancheru", "Zaheerabad"],

    "Siddipet": ["Siddipet", "Gajwel", "Dubbaka"],

    "Suryapet": ["Suryapet", "Kodad", "Huzurnagar"],

    "Vikarabad": ["Vikarabad", "Tandur", "Parigi"],

    "Wanaparthy": ["Wanaparthy", "Pebbair"],

    "Warangal": ["Warangal", "Wardhannapet"],

    "Yadadri Bhuvanagiri": ["Bhongir", "Yadagirigutta", "Choutuppal"]

};


// ========================================
// PUDUCHERRY (4 Districts)
// ========================================

const LOCATION_DATA_PUDUCHERRY = {

    // Puducherry district / region
    "Puducherry": [
        "Puducherry", "Oulgaret", "Villianur", "Ariyankuppam",
        "Bahour", "Nettapakkam", "Mannadipet", "Thirubuvanai"
    ],

    // Karaikal district / region
    "Karaikal": [
        "Karaikal", "Thirunallar", "Neravy", "Kottucherry", "Nedungadu"
    ],

    // Mahe district / region
    "Mahe": ["Mahe", "Palloor", "Pandakkal"],

    // Yanam district / region
    "Yanam": ["Yanam"]

};


// ========================================
// ARUNACHAL PRADESH (26 Districts)
// ========================================

const LOCATION_DATA_ARUNACHAL = {
    "Tawang": ["Tawang", "Bomdila"], "West Kameng": ["Bomdila", "Rupa"], "East Kameng": ["Seppa"], "Papum Pare": ["Itanagar", "Naharlagun"], "Kurung Kumey": ["Koloriang"], "Kra Daadi": ["Palin"], "Lower Subansiri": ["Ziro"], "Upper Subansiri": ["Daporijo"], "West Siang": ["Along"], "East Siang": ["Pasighat"], "Siang": ["Pangin"], "Upper Siang": ["Yingkiong"], "Lower Siang": ["Boleng"], "Lower Dibang Valley": ["Roing"], "Dibang Valley": ["Anini"], "Anjaw": ["Hawai"], "Lohit": ["Tezu"], "Namsai": ["Namsai"], "Changlang": ["Changlang"], "Tirap": ["Khonsa"], "Longding": ["Longding"], "Pakke-Kessang": ["Seijosa"], "Kamle": ["Raga"], "Leparada": ["Basar"], "Shi Yomi": ["Mechuka"]
};

// ========================================
// ASSAM
// ========================================

const LOCATION_DATA_ASSAM = {
    "Baksa": ["Mushalpur", "Baksa"], "Barpeta": ["Barpeta", "Pathsala"], "Bongaigaon": ["Bongaigaon"], "Cachar": ["Silchar"], "Charaideo": ["Sonari"], "Chirang": ["Kajalgaon"], "Darrang": ["Mangaldai"], "Dhemaji": ["Dhemaji"], "Dhubri": ["Dhubri"], "Dibrugarh": ["Dibrugarh", "Mohanbari"], "Dima Hasao": ["Haflong"], "Goalpara": ["Goalpara"], "Golaghat": ["Golaghat"], "Hailakandi": ["Hailakandi"], "Hojai": ["Hojai"], "Jorhat": ["Jorhat"], "Kamrup Metropolitan": ["Guwahati", "Dispur"], "Kamrup": ["Amingaon"], "Karbi Anglong": ["Diphu"], "Karimganj": ["Karimganj"], "Kokrajhar": ["Kokrajhar"], "Lakhimpur": ["North Lakhimpur"], "Majuli": ["Garmur"], "Morigaon": ["Morigaon"], "Nagaon": ["Nagaon"], "Nalbari": ["Nalbari"], "Sivasagar": ["Sivasagar"], "Sonitpur": ["Tezpur"], "South Salmara Mankachar": ["Hatsingimari"], "Tinsukia": ["Tinsukia", "Digboi"], "Udalguri": ["Udalguri"], "West Karbi Anglong": ["Hamren"]
};

// ========================================
// BIHAR (38 Districts)
// ========================================

const LOCATION_DATA_BIHAR = {
    "Araria": ["Araria", "Forbesganj"], "Arwal": ["Arwal"], "Aurangabad": ["Aurangabad", "Rafiganj"], "Banka": ["Banka"], "Begusarai": ["Begusarai", "Barauni"], "Bhagalpur": ["Bhagalpur"], "Bhojpur": ["Arrah"], "Buxar": ["Buxar"], "Darbhanga": ["Darbhanga"], "East Champaran": ["Motihari"], "Gaya": ["Gaya", "Bodh Gaya"], "Gopalganj": ["Gopalganj"], "Jamui": ["Jamui"], "Jehanabad": ["Jehanabad"], "Kaimur": ["Bhabua"], "Katihar": ["Katihar"], "Khagaria": ["Khagaria"], "Kishanganj": ["Kishanganj"], "Lakhisarai": ["Lakhisarai"], "Madhepura": ["Madhepura"], "Madhubani": ["Madhubani"], "Munger": ["Munger"], "Muzaffarpur": ["Muzaffarpur"], "Nalanda": ["Bihar Sharif", "Rajgir"], "Nawada": ["Nawada"], "Patna": ["Patna", "Danapur"], "Purnia": ["Purnia"], "Rohtas": ["Sasaram"], "Saharsa": ["Saharsa"], "Samastipur": ["Samastipur"], "Saran": ["Chapra"], "Sheikhpura": ["Sheikhpura"], "Sheohar": ["Sheohar"], "Sitamarhi": ["Sitamarhi"], "Siwan": ["Siwan"], "Supaul": ["Supaul"], "Vaishali": ["Hajipur"], "West Champaran": ["Bettiah"]
};

// ========================================
// CHHATTISGARH (33 Districts)
// ========================================

const LOCATION_DATA_CHHATTISGARH = {
    "Balod": ["Balod"], "Baloda Bazar": ["Baloda Bazar"], "Balrampur": ["Balrampur"], "Bastar": ["Jagdalpur"], "Bemetara": ["Bemetara"], "Bijapur": ["Bijapur"], "Bilaspur": ["Bilaspur"], "Dantewada": ["Dantewada"], "Dhamtari": ["Dhamtari"], "Durg": ["Durg", "Bhilai"], "Gariaband": ["Gariaband"], "Gaurela Pendra Marwahi": ["Gaurela"], "Janjgir Champa": ["Janjgir"], "Jashpur": ["Jashpur"], "Kanker": ["Kanker"], "Kawardha": ["Kawardha"], "Kondagaon": ["Kondagaon"], "Korba": ["Korba"], "Koriya": ["Baikunthpur"], "Khairgarh Chhuikhadan Gandai": ["Chhuikhadan"], "Manendragarh Chirimiri Bharatpur": ["Manendragarh"], "Mahasamund": ["Mahasamund"], "Mohanlaal Sukhadia Rajnandgaon": ["Rajnandgaon"], "Narayanpur": ["Narayanpur"], "Raigarh": ["Raigarh"], "Raipur": ["Raipur"], "Ramanujganj": ["Ramanujganj"], "Sarangarh Bilaigarh": ["Sarangarh"], "Sakti": ["Sakti"], "Sukma": ["Sukma"], "Surajpur": ["Surajpur"], "Surguja": ["Ambikapur"], "Kabeerdham": ["Kawardha"]
};

// ========================================
// GOA (2 Districts)
// ========================================

const LOCATION_DATA_GOA = {
    "North Goa": ["Panaji", "Mapusa", "Bicholim"], "South Goa": ["Margao", "Mormugao", "Ponda"]
};

// ========================================
// GUJARAT (33 Districts)
// ========================================

const LOCATION_DATA_GUJARAT = {
    "Ahmedabad": ["Ahmedabad", "Daskroi"], "Amreli": ["Amreli"], "Anand": ["Anand"], "Aravalli": ["Modasa"], "Banaskantha": ["Palanpur"], "Bharuch": ["Bharuch"], "Bhavnagar": ["Bhavnagar"], "Botad": ["Botad"], "Chhota Udaipur": ["Chhota Udaipur"], "Dahod": ["Dahod"], "Dang": ["Ahwa"], "Devbhoomi Dwarka": ["Khambhalia"], "Gandhinagar": ["Gandhinagar"], "Gir Somnath": ["Veraval"], "Jamnagar": ["Jamnagar"], "Junagadh": ["Junagadh"], "Kachchh": ["Bhuj", "Gandhidham"], "Kheda": ["Nadiad"], "Mahisagar": ["Lunavada"], "Mehsana": ["Mehsana"], "Morbi": ["Morbi"], "Narmada": ["Rajpipla"], "Navsari": ["Navsari"], "Panchmahal": ["Godhra"], "Patan": ["Patan"], "Porbandar": ["Porbandar"], "Rajkot": ["Rajkot"], "Sabarkantha": ["Himatnagar"], "Surat": ["Surat"], "Surendranagar": ["Surendranagar"], "Tapi": ["Vyara"], "Vadodara": ["Vadodara"], "Valsad": ["Valsad", "Vapi"]
};

// ========================================
// HARYANA (22 Districts)
// ========================================

const LOCATION_DATA_HARYANA = {
    "Ambala": ["Ambala"], "Bhiwani": ["Bhiwani"], "Charkhi Dadri": ["Charkhi Dadri"], "Faridabad": ["Faridabad", "Ballabgarh"], "Fatehabad": ["Fatehabad"], "Gurugram": ["Gurugram", "Sohna"], "Hisar": ["Hisar"], "Jhajjar": ["Jhajjar"], "Jind": ["Jind"], "Kaithal": ["Kaithal"], "Karnal": ["Karnal"], "Kurukshetra": ["Kurukshetra", "Thanesar"], "Mahendragarh": ["Narnaul"], "Nuh": ["Nuh"], "Palwal": ["Palwal"], "Panchkula": ["Panchkula"], "Panipat": ["Panipat"], "Rewari": ["Rewari"], "Rohtak": ["Rohtak"], "Sirsa": ["Sirsa"], "Sonipat": ["Sonipat"], "Yamunanagar": ["Yamunanagar"]
};

// ========================================
// HIMACHAL PRADESH (12 Districts)
// ========================================

const LOCATION_DATA_HIMACHAL = {
    "Bilaspur": ["Bilaspur"], "Chamba": ["Chamba"], "Hamirpur": ["Hamirpur"], "Kangra": ["Dharamshala", "Palampur"], "Kinnaur": ["Reckong Peo"], "Kullu": ["Kullu", "Manali"], "Lahaul Spiti": ["Keylong"], "Mandi": ["Mandi"], "Shimla": ["Shimla"], "Sirmaur": ["Nahan"], "Solan": ["Solan"], "Una": ["Una"]
};

// ========================================
// JHARKHAND (24 Districts)
// ========================================

const LOCATION_DATA_JHARKHAND = {
    "Bokaro": ["Bokaro", "Chas"], "Chatra": ["Chatra"], "Deoghar": ["Deoghar"], "Dhanbad": ["Dhanbad"], "Dumka": ["Dumka"], "East Singhbhum": ["Jamshedpur"], "Garhwa": ["Garhwa"], "Giridih": ["Giridih"], "Godda": ["Godda"], "Gumla": ["Gumla"], "Hazaribagh": ["Hazaribagh"], "Jamtara": ["Jamtara"], "Khunti": ["Khunti"], "Koderma": ["Koderma"], "Latehar": ["Latehar"], "Lohardaga": ["Lohardaga"], "Pakur": ["Pakur"], "Palamu": ["Daltonganj"], "Ramgarh": ["Ramgarh"], "Ranchi": ["Ranchi"], "Sahebganj": ["Sahebganj"], "Saraikela Kharsawan": ["Saraikela"], "Simdega": ["Simdega"], "West Singhbhum": ["Chaibasa"]
};

// ========================================
// KARNATAKA (31 Districts)
// ========================================

const LOCATION_DATA_KARNATAKA = {
    "Bagalkot": ["Bagalkot"], "Ballari": ["Ballari", "Bellary"], "Belagavi": ["Belagavi"], "Bengaluru Rural": ["Devanahalli"], "Bengaluru Urban": ["Bengaluru", "Whitefield"], "Bidar": ["Bidar"], "Chamarajanagar": ["Chamarajanagar"], "Chikballapur": ["Chikballapur"], "Chikkamagaluru": ["Chikkamagaluru", "Chikmagalur"], "Chitradurga": ["Chitradurga"], "Dakshina Kannada": ["Mangaluru", "Mangalore"], "Davanagere": ["Davanagere"], "Dharwad": ["Dharwad", "Hubballi"], "Gadag": ["Gadag"], "Hassan": ["Hassan"], "Haveri": ["Haveri"], "Kalaburagi": ["Kalaburagi", "Gulbarga"], "Kodagu": ["Madikeri"], "Kolar": ["Kolar"], "Koppal": ["Koppal"], "Mandya": ["Mandya"], "Mysuru": ["Mysuru", "Mysore"], "Raichur": ["Raichur"], "Ramanagara": ["Ramanagara"], "Shivamogga": ["Shivamogga", "Shimoga"], "Tumakuru": ["Tumakuru", "Tumkur"], "Udupi": ["Udupi"], "Uttara Kannada": ["Karwar"], "Vijayanagara": ["Hosapete"], "Vijayapura": ["Vijayapura", "Bijapur"], "Yadgir": ["Yadgir"]
};

// ========================================
// KERALA (14 Districts)
// ========================================

const LOCATION_DATA_KERALA = {
    "Alappuzha": ["Alappuzha", "Alleppey"], "Ernakulam": ["Kochi", "Ernakulam"], "Idukki": ["Idukki"], "Kannur": ["Kannur"], "Kasaragod": ["Kasaragod"], "Kollam": ["Kollam"], "Kottayam": ["Kottayam"], "Kozhikode": ["Kozhikode", "Calicut"], "Malappuram": ["Malappuram"], "Palakkad": ["Palakkad"], "Pathanamthitta": ["Pathanamthitta"], "Thiruvananthapuram": ["Thiruvananthapuram", "Trivandrum"], "Thrissur": ["Thrissur"], "Wayanad": ["Kalpetta"]
};

// ========================================
// MADHYA PRADESH (55 Districts)
// ========================================

const LOCATION_DATA_MADHYA = {
    "Agar Malwa": ["Agar"], "Alirajpur": ["Alirajpur"], "Anuppur": ["Anuppur"], "Ashoknagar": ["Ashoknagar"], "Balaghat": ["Balaghat"], "Barwani": ["Barwani"], "Betul": ["Betul"], "Bhind": ["Bhind"], "Bhopal": ["Bhopal"], "Burhanpur": ["Burhanpur"], "Chhatarpur": ["Chhatarpur"], "Chhindwara": ["Chhindwara"], "Damoh": ["Damoh"], "Datia": ["Datia"], "Dewas": ["Dewas"], "Dhar": ["Dhar"], "Dindori": ["Dindori"], "Guna": ["Guna"], "Gwalior": ["Gwalior"], "Harda": ["Harda"], "Hoshangabad": ["Hoshangabad"], "Indore": ["Indore"], "Jabalpur": ["Jabalpur"], "Jhabua": ["Jhabua"], "Katni": ["Katni"], "Khandwa": ["Khandwa"], "Khargone": ["Khargone"], "Mandla": ["Mandla"], "Mandsaur": ["Mandsaur"], "Morena": ["Morena"], "Narsinghpur": ["Narsinghpur"], "Neemuch": ["Neemuch"], "Niwari": ["Niwari"], "Panna": ["Panna"], "Raisen": ["Raisen"], "Rajgarh": ["Rajgarh"], "Ratlam": ["Ratlam"], "Rewa": ["Rewa"], "Sagar": ["Sagar"], "Satna": ["Satna"], "Sehore": ["Sehore"], "Seoni": ["Seoni"], "Shahdol": ["Shahdol"], "Shajapur": ["Shajapur"], "Sheopur": ["Sheopur"], "Shivpuri": ["Shivpuri"], "Sidhi": ["Sidhi"], "Singrauli": ["Singrauli"], "Tikamgarh": ["Tikamgarh"], "Ujjain": ["Ujjain"], "Umaria": ["Umaria"], "Vidisha": ["Vidisha"], "Badi": ["Badi"], "Kotma": ["Kotma"], "Maihar": ["Maihar"]
};

// ========================================
// MAHARASHTRA (36 Districts)
// ========================================

const LOCATION_DATA_MAHARASHTRA = {
    "Ahmednagar": ["Ahmednagar"], "Akola": ["Akola"], "Amravati": ["Amravati"], "Aurangabad": ["Aurangabad", "Chhatrapati Sambhajinagar"], "Beed": ["Beed"], "Bhandara": ["Bhandara"], "Buldhana": ["Buldhana"], "Chandrapur": ["Chandrapur"], "Dhule": ["Dhule"], "Gadchiroli": ["Gadchiroli"], "Gondia": ["Gondia"], "Hingoli": ["Hingoli"], "Jalgaon": ["Jalgaon"], "Jalna": ["Jalna"], "Kolhapur": ["Kolhapur"], "Latur": ["Latur"], "Mumbai City": ["Mumbai"], "Mumbai Suburban": ["Mumbai", "Andheri"], "Nagpur": ["Nagpur"], "Nanded": ["Nanded"], "Nandurbar": ["Nandurbar"], "Nashik": ["Nashik"], "Osmanabad": ["Osmanabad"], "Palghar": ["Palghar", "Vasai"], "Parbhani": ["Parbhani"], "Pune": ["Pune", "Pimpri Chinchwad"], "Raigad": ["Alibaug", "Panvel"], "Ratnagiri": ["Ratnagiri"], "Sangli": ["Sangli"], "Satara": ["Satara"], "Sindhudurg": ["Oros"], "Solapur": ["Solapur"], "Thane": ["Thane"], "Wardha": ["Wardha"], "Washim": ["Washim"], "Yavatmal": ["Yavatmal"]
};

// ========================================
// MANIPUR (16 Districts)
// ========================================

const LOCATION_DATA_MANIPUR = {
    "Bishnupur": ["Bishnupur"], "Chandel": ["Chandel"], "Churachandpur": ["Churachandpur"], "Imphal East": ["Imphal", "Porompat"], "Imphal West": ["Imphal", "Lamphal"], "Jiribam": ["Jiribam"], "Kakching": ["Kakching"], "Kamjong": ["Kamjong"], "Kangpokpi": ["Kangpokpi"], "Noney": ["Noney"], "Pherzawl": ["Pherzawl"], "Senapati": ["Senapati"], "Tamenglong": ["Tamenglong"], "Tengnoupal": ["Tengnoupal"], "Thoubal": ["Thoubal"], "Ukhrul": ["Ukhrul"]
};

// ========================================
// MEGHALAYA (12 Districts)
// ========================================

const LOCATION_DATA_MEGHALAYA = {
    "East Garo Hills": ["Williamnagar"], "East Jaintia Hills": ["Khliehriat"], "East Khasi Hills": ["Shillong"], "North Garo Hills": ["Resubelpara"], "Ri Bhoi": ["Nongpoh"], "South Garo Hills": ["Baghmara"], "South West Garo Hills": ["Ampati"], "South West Khasi Hills": ["Mawkyrwat"], "East Khasi Hills West": ["Mairang"], "West Garo Hills": ["Tura"], "West Jaintia Hills": ["Jowai"], "West Khasi Hills": ["Nongstoin"]
};

// ========================================
// MIZORAM (11 Districts)
// ========================================

const LOCATION_DATA_MIZORAM = {
    "Aizawl": ["Aizawl"], "Champhai": ["Champhai"], "Hnahthial": ["Hnahthial"], "Khawzawl": ["Khawzawl"], "Kolasib": ["Kolasib"], "Lawngtlai": ["Lawngtlai"], "Lunglei": ["Lunglei"], "Mamit": ["Mamit"], "Saiha": ["Saiha"], "Saitual": ["Saitual"], "Serchhip": ["Serchhip"]
};

// ========================================
// NAGALAND (16 Districts)
// ========================================

const LOCATION_DATA_NAGALAND = {
    "Dimapur": ["Dimapur"], "Kiphire": ["Kiphire"], "Kohima": ["Kohima"], "Longleng": ["Longleng"], "Mokokchung": ["Mokokchung"], "Mon": ["Mon"], "Noklak": ["Noklak"], "Peren": ["Peren"], "Phek": ["Phek"], "Tuensang": ["Tuensang"], "Wokha": ["Wokha"], "Zunheboto": ["Zunheboto"], "Chumukedima": ["Chumukedima"], "Niuland": ["Niuland"], "Shamator": ["Shamator"], "Tseminyu": ["Tseminyu"]
};

// ========================================
// ODISHA (30 Districts)
// ========================================

const LOCATION_DATA_ODISHA = {
    "Angul": ["Angul", "Athmallik"], "Balangir": ["Balangir"], "Balasore": ["Balasore"], "Bargarh": ["Bargarh"], "Bhadrak": ["Bhadrak"], "Boudh": ["Boudh"], "Cuttack": ["Cuttack"], "Deogarh": ["Deogarh"], "Dhenkanal": ["Dhenkanal"], "Gajapati": ["Paralakhemundi"], "Ganjam": ["Chhatrapur", "Berhampur"], "Jagatsinghpur": ["Jagatsinghpur"], "Jajpur": ["Jajpur"], "Jharsuguda": ["Jharsuguda"], "Kalahandi": ["Bhawanipatna"], "Kandhamal": ["Phulbani"], "Kendrapara": ["Kendrapara"], "Keonjhar": ["Keonjhar"], "Khurda": ["Bhubaneswar", "Khurda"], "Koraput": ["Koraput"], "Malkangiri": ["Malkangiri"], "Mayurbhanj": ["Baripada"], "Nabarangpur": ["Nabarangpur"], "Nayagarh": ["Nayagarh"], "Nuapada": ["Nuapada"], "Puri": ["Puri"], "Rayagada": ["Rayagada"], "Sambalpur": ["Sambalpur"], "Subarnapur": ["Subarnapur"], "Sundargarh": ["Rourkela", "Sundargarh"]
};

// ========================================
// PUNJAB (23 Districts)
// ========================================

const LOCATION_DATA_PUNJAB = {
    "Amritsar": ["Amritsar"], "Barnala": ["Barnala"], "Bathinda": ["Bathinda"], "Faridkot": ["Faridkot"], "Fatehgarh Sahib": ["Fatehgarh Sahib"], "Fazilka": ["Fazilka"], "Firozpur": ["Firozpur"], "Gurdaspur": ["Gurdaspur"], "Hoshiarpur": ["Hoshiarpur"], "Jalandhar": ["Jalandhar"], "Kapurthala": ["Kapurthala"], "Ludhiana": ["Ludhiana"], "Malerkotla": ["Malerkotla"], "Mansa": ["Mansa"], "Moga": ["Moga"], "Muktsar": ["Muktsar"], "Nawanshahr": ["Nawanshahr"], "Pathankot": ["Pathankot"], "Patiala": ["Patiala"], "Rupnagar": ["Rupnagar"], "Sangrur": ["Sangrur"], "SAS Nagar": ["Mohali"], "Tarn Taran": ["Tarn Taran"]
};

// ========================================
// RAJASTHAN (50 Districts)
// ========================================

const LOCATION_DATA_RAJASTHAN = {
    "Ajmer": ["Ajmer", "Kishangarh"], "Alwar": ["Alwar"], "Banswara": ["Banswara"], "Baran": ["Baran"], "Barmer": ["Barmer"], "Bharatpur": ["Bharatpur"], "Bhilwara": ["Bhilwara"], "Bikaner": ["Bikaner"], "Bundi": ["Bundi"], "Chittorgarh": ["Chittorgarh"], "Churu": ["Churu"], "Dausa": ["Dausa"], "Dholpur": ["Dholpur"], "Dungarpur": ["Dungarpur"], "Hanumangarh": ["Hanumangarh"], "Jaipur": ["Jaipur"], "Jaisalmer": ["Jaisalmer"], "Jalore": ["Jalore"], "Jhalawar": ["Jhalawar"], "Jhunjhunu": ["Jhunjhunu"], "Jodhpur": ["Jodhpur"], "Karauli": ["Karauli"], "Kota": ["Kota"], "Nagaur": ["Nagaur"], "Pali": ["Pali"], "Pratapgarh": ["Pratapgarh"], "Rajsamand": ["Rajsamand"], "Sawai Madhopur": ["Sawai Madhopur"], "Sikar": ["Sikar"], "Sirohi": ["Sirohi"], "Sri Ganganagar": ["Ganganagar"], "Tonk": ["Tonk"], "Udaipur": ["Udaipur"], "Balotra": ["Balotra"], "Beawar": ["Beawar"], "Deeg": ["Deeg"], "Didwana Kuchaman": ["Didwana"], "Kekri": ["Kekri"], "Khairthal": ["Khairthal"], "Neem Ka Thana": ["Neem Ka Thana"], "Phalodi": ["Phalodi"], "Salumbar": ["Salumbar"], "Sanchore": ["Sanchore"], "Shahpura": ["Shahpura"], "Jaipur Rural": ["Chomu"], "Sharee": ["Sharee"]
};

// ========================================
// SIKKIM (6 Districts)
// ========================================

const LOCATION_DATA_SIKKIM = {
    "East Sikkim": ["Gangtok"], "West Sikkim": ["Geyzing"], "North Sikkim": ["Mangan"], "South Sikkim": ["Namchi"], "Pakyong": ["Pakyong"], "Soreng": ["Soreng"]
};

// ========================================
// TAMIL NADU (38 Districts)
// ========================================

const LOCATION_DATA_TAMILNADU = {
    "Ariyalur": ["Ariyalur"], "Chengalpattu": ["Chengalpattu"], "Chennai": ["Chennai"], "Coimbatore": ["Coimbatore"], "Cuddalore": ["Cuddalore"], "Dharmapuri": ["Dharmapuri"], "Dindigul": ["Dindigul"], "Erode": ["Erode"], "Kallakurichi": ["Kallakurichi"], "Kanchipuram": ["Kanchipuram"], "Kanyakumari": ["Nagercoil"], "Karur": ["Karur"], "Krishnagiri": ["Krishnagiri"], "Madurai": ["Madurai"], "Mayiladuthurai": ["Mayiladuthurai"], "Nagapattinam": ["Nagapattinam"], "Nilgiris": ["Ooty", "Udhagamandalam"], "Perambalur": ["Perambalur"], "Pudukkottai": ["Pudukkottai"], "Ramanathapuram": ["Ramanathapuram"], "Ranipet": ["Ranipet"], "Salem": ["Salem"], "Sivaganga": ["Sivaganga"], "Tenkasi": ["Tenkasi"], "Thanjavur": ["Thanjavur"], "Thoothukudi": ["Thoothukudi", "Tuticorin"], "Thiruchchirappalli": ["Tiruchirappalli"], "Thiruvallur": ["Tiruvallur"], "Tiruchirappalli": ["Tiruchirappalli"], "Tirunelveli": ["Tirunelveli"], "Tirupathur": ["Tirupathur"], "Tiruvannamalai": ["Tiruvannamalai"], "Vellore": ["Vellore"], "Villupuram": ["Villupuram"], "Viluppuram": ["Viluppuram"], "Virudhunagar": ["Virudhunagar"], "Chennai South": ["Chennai"], "Nagapattinam South": ["Vedaranyam"]
};

// ========================================
// TRIPURA (8 Districts)
// ========================================

const LOCATION_DATA_TRIPURA = {
    "Dhalai": ["Ambassa"], "Gomati": ["Udaipur"], "Khowai": ["Khowai"], "North Tripura": ["Dharmanagar", "Kailashahar"], "Sepahijala": ["Bishalgarh"], "South Tripura": ["Belonia"], "Unakoti": ["Kailashahar"], "West Tripura": ["Agartala"]
};

// ========================================
// UTTAR PRADESH (75 Districts)
// ========================================

const LOCATION_DATA_UTTAR_PRADESH = {
    "Agra": ["Agra"], "Aligarh": ["Aligarh"], "Ambedkar Nagar": ["Akbarpur"], "Amethi": ["Amethi"], "Amroha": ["Amroha"], "Auraiya": ["Auraiya"], "Ayodhya": ["Ayodhya", "Faizabad"], "Azamgarh": ["Azamgarh"], "Baghpat": ["Baghpat"], "Bahraich": ["Bahraich"], "Ballia": ["Ballia"], "Balrampur": ["Balrampur"], "Banda": ["Banda"], "Barabanki": ["Barabanki"], "Bareilly": ["Bareilly"], "Basti": ["Basti"], "Bhadohi": ["Bhadohi"], "Bijnor": ["Bijnor"], "Budaun": ["Budaun"], "Bulandshahr": ["Bulandshahr"], "Chandauli": ["Chandauli"], "Chitrakoot": ["Chitrakoot"], "Deoria": ["Deoria"], "Etah": ["Etah"], "Etawah": ["Etawah"], "Farrukhabad": ["Farrukhabad"], "Fatehpur": ["Fatehpur"], "Firozabad": ["Firozabad"], "Gautam Buddh Nagar": ["Noida", "Greater Noida"], "Ghaziabad": ["Ghaziabad"], "Ghazipur": ["Ghazipur"], "Gonda": ["Gonda"], "Gorakhpur": ["Gorakhpur"], "Hamirpur": ["Hamirpur"], "Hapur": ["Hapur"], "Hardoi": ["Hardoi"], "Hathras": ["Hathras"], "Jalaun": ["Orai"], "Jaunpur": ["Jaunpur"], "Jhansi": ["Jhansi"], "Kannauj": ["Kannauj"], "Kanpur Dehat": ["Akbarpur"], "Kanpur Nagar": ["Kanpur"], "Kasganj": ["Kasganj"], "Kaushambi": ["Manjhanpur"], "Kushinagar": ["Padrauna"], "Lakhimpur Kheri": ["Lakhimpur"], "Lalitpur": ["Lalitpur"], "Lucknow": ["Lucknow"], "Maharajganj": ["Maharajganj"], "Mahoba": ["Mahoba"], "Mainpuri": ["Mainpuri"], "Mathura": ["Mathura"], "Mau": ["Mau"], "Meerut": ["Meerut"], "Mirzapur": ["Mirzapur"], "Moradabad": ["Moradabad"], "Muzaffarnagar": ["Muzaffarnagar"], "Pilibhit": ["Pilibhit"], "Pratapgarh": ["Bela Pratapgarh"], "Prayagraj": ["Prayagraj", "Allahabad"], "Raebareli": ["Raebareli"], "Rampur": ["Rampur"], "Saharanpur": ["Saharanpur"], "Sambhal": ["Sambhal"], "Sant Kabir Nagar": ["Khalilabad"], "Shahjahanpur": ["Shahjahanpur"], "Shamli": ["Shamli"], "Shravasti": ["Bhinga"], "Siddharth Nagar": ["Naugarh"], "Sitapur": ["Sitapur"], "Sonbhadra": ["Robertsganj"], "Sultanpur": ["Sultanpur"], "Unnao": ["Unnao"], "Varanasi": ["Varanasi"]
};

// ========================================
// UTTARAKHAND (13 Districts)
// ========================================

const LOCATION_DATA_UTTARAKHAND = {
    "Almora": ["Almora"], "Bageshwar": ["Bageshwar"], "Chamoli": ["Gopeshwar"], "Champawat": ["Champawat"], "Dehradun": ["Dehradun", "Rishikesh"], "Haridwar": ["Haridwar"], "Nainital": ["Nainital", "Haldwani"], "Pauri Garhwal": ["Pauri"], "Pithoragarh": ["Pithoragarh"], "Rudraprayag": ["Rudraprayag"], "Tehri Garhwal": ["New Tehri"], "Udham Singh Nagar": ["Rudrapur"], "Uttarkashi": ["Uttarkashi"]
};

// ========================================
// WEST BENGAL (23 Districts)
// ========================================

const LOCATION_DATA_WEST_BENGAL = {
    "Alipurduar": ["Alipurduar"], "Bankura": ["Bankura"], "Birbhum": ["Suri"], "Cooch Behar": ["Cooch Behar"], "Dakshin Dinajpur": ["Balurghat"], "Darjeeling": ["Darjeeling", "Siliguri"], "Hooghly": ["Hugli", "Serampore"], "Howrah": ["Howrah"], "Jalpaiguri": ["Jalpaiguri"], "Jhargram": ["Jhargram"], "Kalimpong": ["Kalimpong"], "Kolkata": ["Kolkata"], "Malda": ["Malda"], "Murshidabad": ["Baharampur"], "Nadia": ["Krishnanagar"], "North 24 Parganas": ["Barasat"], "Paschim Bardhaman": ["Asansol"], "Paschim Medinipur": ["Medinipur"], "Purba Bardhaman": ["Bardhaman"], "Purba Medinipur": ["Tamluk"], "Purulia": ["Purulia"], "South 24 Parganas": ["Alipore"], "Uttar Dinajpur": ["Raiganj"]
};

// ========================================
// ANDAMAN AND NICOBAR ISLANDS (3 Districts)
// ========================================

const LOCATION_DATA_ANDAMAN = {
    "South Andaman": ["Port Blair"], "North and Middle Andaman": ["Mayabunder"], "Nicobar": ["Car Nicobar"]
};

// ========================================
// CHANDIGARH (1 District)
// ========================================

const LOCATION_DATA_CHANDIGARH = {
    "Chandigarh": ["Chandigarh"]
};

// ========================================
// DADRA AND NAGAR HAVELI AND DAMAN AND DIU (3 Districts)
// ========================================

const LOCATION_DATA_DAMAN_DIU = {
    "Dadra and Nagar Haveli": ["Silvassa"], "Daman": ["Daman"], "Diu": ["Diu"]
};

// ========================================
// NCT OF DELHI (11 Districts)
// ========================================

const LOCATION_DATA_DELHI = {
    "Central Delhi": ["Delhi", "Darya Ganj"], "East Delhi": ["Preet Vihar"], "New Delhi": ["New Delhi", "Connaught Place"], "North Delhi": ["Civil Lines"], "North East Delhi": ["Seelampur"], "North West Delhi": ["Rohini"], "Shahdara": ["Shahdara"], "South Delhi": ["Saket"], "South East Delhi": ["Lajpat Nagar"], "South West Delhi": ["Dwarka"], "West Delhi": ["Janakpuri"]
};

// ========================================
// JAMMU AND KASHMIR (20 Districts)
// ========================================

const LOCATION_DATA_JAMMU_KASHMIR = {
    "Anantnag": ["Anantnag"], "Bandipora": ["Bandipora"], "Baramulla": ["Baramulla"], "Budgam": ["Budgam"], "Doda": ["Doda"], "Ganderbal": ["Ganderbal"], "Jammu": ["Jammu"], "Kathua": ["Kathua"], "Kishtwar": ["Kishtwar"], "Kulgam": ["Kulgam"], "Kupwara": ["Kupwara"], "Poonch": ["Poonch"], "Pulwama": ["Pulwama"], "Rajouri": ["Rajouri"], "Ramban": ["Ramban"], "Reasi": ["Reasi"], "Samba": ["Samba"], "Shopian": ["Shopian"], "Srinagar": ["Srinagar"], "Udhampur": ["Udhampur"]
};

// ========================================
// LADAKH (2 Districts)
// ========================================

const LOCATION_DATA_LADAKH = {
    "Kargil": ["Kargil"], "Leh": ["Leh", "Leh Ladakh"]
};

// ========================================
// LAKSHADWEEP (1 District)
// ========================================

const LOCATION_DATA_LAKSHADWEEP = {
    "Lakshadweep": ["Kavaratti"]
};

// ========================================
// FINAL DATA (State -> District -> Cities)
// ========================================

const LOCATION_DATA = {

    "Andhra Pradesh": LOCATION_DATA_ANDHRA,
    "Arunachal Pradesh": LOCATION_DATA_ARUNACHAL,
    "Assam": LOCATION_DATA_ASSAM,
    "Bihar": LOCATION_DATA_BIHAR,
    "Chhattisgarh": LOCATION_DATA_CHHATTISGARH,
    "Goa": LOCATION_DATA_GOA,
    "Gujarat": LOCATION_DATA_GUJARAT,
    "Haryana": LOCATION_DATA_HARYANA,
    "Himachal Pradesh": LOCATION_DATA_HIMACHAL,
    "Jharkhand": LOCATION_DATA_JHARKHAND,
    "Karnataka": LOCATION_DATA_KARNATAKA,
    "Kerala": LOCATION_DATA_KERALA,
    "Madhya Pradesh": LOCATION_DATA_MADHYA,
    "Maharashtra": LOCATION_DATA_MAHARASHTRA,
    "Manipur": LOCATION_DATA_MANIPUR,
    "Meghalaya": LOCATION_DATA_MEGHALAYA,
    "Mizoram": LOCATION_DATA_MIZORAM,
    "Nagaland": LOCATION_DATA_NAGALAND,
    "Odisha": LOCATION_DATA_ODISHA,
    "Punjab": LOCATION_DATA_PUNJAB,
    "Rajasthan": LOCATION_DATA_RAJASTHAN,
    "Sikkim": LOCATION_DATA_SIKKIM,
    "Tamil Nadu": LOCATION_DATA_TAMILNADU,
    "Telangana": LOCATION_DATA_TELANGANA,
    "Tripura": LOCATION_DATA_TRIPURA,
    "Uttar Pradesh": LOCATION_DATA_UTTAR_PRADESH,
    "Uttarakhand": LOCATION_DATA_UTTARAKHAND,
    "West Bengal": LOCATION_DATA_WEST_BENGAL,
    "Andaman and Nicobar Islands": LOCATION_DATA_ANDAMAN,
    "Chandigarh": LOCATION_DATA_CHANDIGARH,
    "Dadra and Nagar Haveli and Daman and Diu": LOCATION_DATA_DAMAN_DIU,
    "NCT of Delhi": LOCATION_DATA_DELHI,
    "Jammu and Kashmir": LOCATION_DATA_JAMMU_KASHMIR,
    "Ladakh": LOCATION_DATA_LADAKH,
    "Lakshadweep": LOCATION_DATA_LAKSHADWEEP,
    "Puducherry": LOCATION_DATA_PUDUCHERRY

};


// =====================================================
// UNIQUE OPTIONS HELPER
// =====================================================
// Okedata peru malli malli kanipinchakunda list ni
// unique ga marchi istundi (case-insensitive check).

function getUniqueOptions(values) {

    const seen = new Set();
    const unique = [];

    (values || []).forEach(value => {

        if (!value) return;

        const trimmed = String(value).trim();
        const key = trimmed.toLowerCase();

        if (!key || seen.has(key)) return;

        seen.add(key);
        unique.push(trimmed);

    });

    return unique;

}


// =====================================================
// SELECT FILL HELPER
// =====================================================
// Select lo unna purata options ni remove chesi,
// placeholder + unique options ni fill chestundi.

function fillSelectOptions(selectElement, values, placeholderText) {

    if (!selectElement) return;

    selectElement.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = placeholderText || "Select";
    selectElement.appendChild(placeholder);

    getUniqueOptions(values).forEach(value => {

        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        selectElement.appendChild(option);

    });

    // Placeholder ni default ga select cheyadam

    selectElement.value = "";

}


// =====================================================
// CASCADE: STATE -> DISTRICT -> CITY/TOWN
// =====================================================
// 1. Mundu ga STATE select cheyyali.
// 2. State select ayyaka matrame DISTRICT options
//    automatic ga vastayi (aa state base chesukoni).
// 3. District select ayyaka matrame CITY/TOWN options
//    automatic ga vastayi (aa district base chesukoni).
// 4. Parent marchinappudu child selection reset avutundi.

function setupLocationDropdowns(options) {

    const stateSelect = options.stateSelect;
    const districtSelect = options.districtSelect;
    const citySelect = options.citySelect;

    if (!stateSelect || !districtSelect) return;

    const statePlaceholder = options.statePlaceholder || "Select State";
    const districtPlaceholder = options.districtPlaceholder || "Select District";
    const cityPlaceholder = options.cityPlaceholder || "Select City/Town";


    // STEP 1: STATE OPTIONS (unique)

    fillSelectOptions(stateSelect, Object.keys(LOCATION_DATA), statePlaceholder);
    districtSelect.disabled = true;
    if (citySelect) citySelect.disabled = true;


    // STEP 2: STATE base chesukoni DISTRICT OPTIONS

    function updateDistricts() {

        const state = stateSelect.value;
        const districts = state ? Object.keys(LOCATION_DATA[state] || {}) : [];

        fillSelectOptions(districtSelect, districts, districtPlaceholder);
        districtSelect.disabled = !state;

        if (citySelect) {
            fillSelectOptions(citySelect, [], cityPlaceholder);
            citySelect.disabled = true;
        }

    }


    // STEP 3: DISTRICT base chesukoni CITY/TOWN OPTIONS

    function updateCities() {

        if (!citySelect) return;

        const state = stateSelect.value;
        const district = districtSelect.value;
        const cities = (state && district && LOCATION_DATA[state])
            ? (LOCATION_DATA[state][district] || [])
            : [];

        fillSelectOptions(citySelect, cities, cityPlaceholder);
        citySelect.disabled = !district;

    }

    stateSelect.addEventListener("change", updateDistricts);
    districtSelect.addEventListener("change", updateCities);


    // Initial state (State lekapothe District/City disable)

    updateDistricts();

}


// =====================================================
// ROUTE STOP OPTIONS (User Details base chesukoni)
// =====================================================
// User details lo ichina City/Town + District ni first lo
// petti, aa district lo unna anni cities/towns kuda add
// chesi UNIQUE list ni istundi. Route screen lo ee list
// ne From Stop / To Stop options ga vastundi.

function buildRouteStopOptions(details) {

    if (!details) return [];

    const state = String(details.state || "").trim();
    const district = String(details.district || "").trim();
    const city = String(details.city || "").trim();

    const stops = [];

    // User ichina City/Town and District first lo vastayi

    stops.push(city, district);


    // Aa district lo unna anni cities/towns automatic ga

    if (state && district && LOCATION_DATA[state]) {

        (LOCATION_DATA[state][district] || []).forEach(stop => stops.push(stop));

    } else if (state && LOCATION_DATA[state]) {

        // District save avvakapothe -> aa state lo unna
        // anni cities/towns fallback ga vastayi

        Object.values(LOCATION_DATA[state]).forEach(cities => {
            (cities || []).forEach(stop => stops.push(stop));
        });

    }

    return getUniqueOptions(stops);

}


// =====================================================
// BUS STOP HELPERS (Route screen)
// =====================================================
// From Stop options = bus stops belonging to a town.
// To Stop options = bus stops in OTHER towns of the same
// district (valid destinations from the selected stop).
// Same single location source for Student + Employee.

// Standard bus stops derived for a town.

function getCityStops(town) {

    if (!town) return [];

    return [
        town + " Bus Station",
        town + " RTC Complex",
        town + " Bus Stand",
        town + " Railway Station",
        town + " Main Road"
    ];

}


// Towns of a district (single source of truth).

function getDistrictTowns(state, district) {

    if (!state || !district || !LOCATION_DATA[state]) return [];

    return (LOCATION_DATA[state][district] || []).slice();

}


// From Stop options based on the City/Town selected in User Details.
// Fallback: district HQ towns when city is missing.

function buildFromStops(details) {

    if (!details) return [];

    const state = String(details.state || "").trim();
    const district = String(details.district || "").trim();
    const city = String(details.city || "").trim();

    if (city) return getUniqueOptions(getCityStops(city));

    // City lekapothe district lo unna towns nunchi stops

    if (state && district && LOCATION_DATA[state]) {

        const towns = getDistrictTowns(state, district);
        const stops = [];
        towns.forEach(town => stops.push(...getCityStops(town)));
        return getUniqueOptions(stops);

    }

    return [];

}


// Determine the town from a stop name (strip known suffixes).

function townFromStop(stop) {

    if (!stop) return "";

    return String(stop)
        .replace(/ Bus Station$/i, "")
        .replace(/ RTC Complex$/i, "")
        .replace(/ Bus Stand$/i, "")
        .replace(/ Railway Station$/i, "")
        .replace(/ Main Road$/i, "")
        .trim();

}


// To Stop options = stops in other towns of the district
// (valid destinations reachable from the selected From Stop).

function buildToStops(details, fromStop) {

    if (!details) return [];

    const state = String(details.state || "").trim();
    const district = String(details.district || "").trim();

    if (!state || !district || !LOCATION_DATA[state]) return [];

    const fromTown = townFromStop(fromStop);
    const towns = getDistrictTowns(state, district);
    const stops = [];

    towns.forEach(town => {

        if (fromTown && String(town).toLowerCase() === fromTown.toLowerCase()) return;

        stops.push(...getCityStops(town));

    });

    return getUniqueOptions(stops);

}
