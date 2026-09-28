/**
 * A starter library of Tamil cinema for the question creator.
 *
 * Every entry carries the four independent pieces a KOLLYWOOD question needs:
 * hero, heroine, movie and one or more songs. Picking a movie here fills the
 * creator's form (they can always edit the fields afterwards).
 */
export type MovieEntry = {
  movie: string;
  year: number;
  hero: string;
  heroine: string;
  songs: string[];
};

export const MOVIE_DATASET: MovieEntry[] = [
  // ---------- Vijay ----------
  { movie: "Ghilli", year: 2004, hero: "Vijay", heroine: "Trisha", songs: ["Appadi Podu", "Soora Thenga", "Kabadi Kabadi"] },
  { movie: "Kushi", year: 2000, hero: "Vijay", heroine: "Jyothika", songs: ["Kattipudi Kattipudi", "Aahaa Enna Porutham", "Oru Ponnu Onnu"] },
  { movie: "Mersal", year: 2017, hero: "Vijay", heroine: "Samantha", songs: ["Aalaporaan Thamizhan", "Maacho", "Neethanae"] },
  { movie: "Theri", year: 2016, hero: "Vijay", heroine: "Samantha", songs: ["Jithu Jilladi", "Chella Kutti", "En Jeevan"] },
  { movie: "Kaththi", year: 2014, hero: "Vijay", heroine: "Samantha", songs: ["Selfie Pulla", "Pakka Local", "Aathi"] },
  { movie: "Thuppakki", year: 2012, hero: "Vijay", heroine: "Kajal Aggarwal", songs: ["Google Google", "Antarctica", "Vennilave Vennilave"] },
  { movie: "Nanban", year: 2012, hero: "Vijay", heroine: "Ileana D'Cruz", songs: ["En Frienda Pola", "Asku Laska", "Nalla Nanban"] },
  { movie: "Thalaivaa", year: 2013, hero: "Vijay", heroine: "Amala Paul", songs: ["Vaanganna Vanakkanganna", "Yaar Indha Saalai Oram"] },
  { movie: "Bigil", year: 2019, hero: "Vijay", heroine: "Nayanthara", songs: ["Verithanam", "Singappenney", "Hey Nanba"] },
  { movie: "Sarkar", year: 2018, hero: "Vijay", heroine: "Keerthy Suresh", songs: ["Simtaangaran", "OMG Ponnu", "Top Tucker"] },
  { movie: "Master", year: 2021, hero: "Vijay", heroine: "Malavika Mohanan", songs: ["Vaathi Coming", "Kutti Story", "Andha Kanna Paathaakaa"] },
  { movie: "Beast", year: 2022, hero: "Vijay", heroine: "Pooja Hegde", songs: ["Arabic Kuthu", "Jolly O Gymkhana", "Beast Mode"] },
  { movie: "Varisu", year: 2023, hero: "Vijay", heroine: "Rashmika Mandanna", songs: ["Ranjithame", "Jimikki Ponnu", "Thee Thalapathy"] },
  { movie: "Leo", year: 2023, hero: "Vijay", heroine: "Trisha", songs: ["Naa Ready", "Bloody Sweet", "Anbenum"] },
  { movie: "Villu", year: 2009, hero: "Vijay", heroine: "Nayanthara", songs: ["Daddy Mummy", "Hey Rama"] },
  { movie: "Jilla", year: 2014, hero: "Vijay", heroine: "Kajal Aggarwal", songs: ["Paattu Onnu", "Jingunamani"] },
  { movie: "Puli", year: 2015, hero: "Vijay", heroine: "Hansika Motwani", songs: ["Yaendi Yaendi", "Manidha Manidha"] },
  { movie: "The Greatest of All Time", year: 2024, hero: "Vijay", heroine: "Meenakshi Chaudhary", songs: ["Whistle Podu"] },

  // ---------- Ajith ----------
  { movie: "Mankatha", year: 2011, hero: "Ajith", heroine: "Trisha", songs: ["Vilayadu Mankatha", "Machi Open the Bottle", "Balle Lakka"] },
  { movie: "Arrambam", year: 2013, hero: "Ajith", heroine: "Nayanthara", songs: ["Adadada Arrambame", "Stylish Thamizhachi", "En Fuse Pochu"] },
  { movie: "Yennai Arindhaal", year: 2015, hero: "Ajith", heroine: "Trisha", songs: ["Adhaaru Adhaaru", "Mazhai Vara Pogudhae"] },
  { movie: "Vedalam", year: 2015, hero: "Ajith", heroine: "Shruti Haasan", songs: ["Aaluma Doluma", "Don't You Mess With Me", "Veera Vinayaka"] },
  { movie: "Viswasam", year: 2019, hero: "Ajith", heroine: "Nayanthara", songs: ["Adchithooku", "Kannaana Kanney", "Vaaney Vaaney"] },
  { movie: "Thunivu", year: 2023, hero: "Ajith", heroine: "Manju Warrier", songs: ["Chilla Chilla", "Kasethan Kadavulada", "Gangster"] },
  { movie: "Billa", year: 2007, hero: "Ajith", heroine: "Nayanthara", songs: ["My Name is Billa"] },
  { movie: "Vivegam", year: 2017, hero: "Ajith", heroine: "Kajal Aggarwal", songs: ["Surviva", "Thalai Viduthalai"] },
  { movie: "Kandukondain Kandukondain", year: 2000, hero: "Ajith", heroine: "Tabu", songs: ["Kandukondain Kandukondain", "Enna Solla Pogirai", "Konjum Mainakkale"] },

  // ---------- Rajinikanth ----------
  { movie: "Enthiran", year: 2010, hero: "Rajinikanth", heroine: "Aishwarya Rai Bachchan", songs: ["Kadhal Anukkal", "Kilimanjaro", "Irumbile Oru Irudhaiyam"] },
  { movie: "2.0", year: 2018, hero: "Rajinikanth", heroine: "Amy Jackson", songs: ["Endhira Logathu Sundariye", "Pullinangal", "Raajali"] },
  { movie: "Kabali", year: 2016, hero: "Rajinikanth", heroine: "Radhika Apte", songs: ["Neruppu Da", "Ulagam Oruvanukka", "Veera Thurandhara"] },
  { movie: "Jailer", year: 2023, hero: "Rajinikanth", heroine: "Tamannaah", songs: ["Kaavaalaa", "Hukum"] },
  { movie: "Sivaji", year: 2007, hero: "Rajinikanth", heroine: "Shriya Saran", songs: ["Balleilakka", "Sahana", "Athiradee"] },
  { movie: "Muthu", year: 1995, hero: "Rajinikanth", heroine: "Meena", songs: ["Kulu Kulu", "Vidukathaiyaa", "Thillana Thillana"] },
  { movie: "Padayappa", year: 1999, hero: "Rajinikanth", heroine: "Ramya Krishnan", songs: ["Minsara Poove", "Suthi Suthi Vandheega", "En Peru Padayappa"] },
  { movie: "Thalapathi", year: 1991, hero: "Rajinikanth", heroine: "Shobana", songs: ["Rakkamma Kaiya Thattu", "Chinna Thayaval", "Sundari Kannal Oru Sethi"] },
  { movie: "Chandramukhi", year: 2005, hero: "Rajinikanth", heroine: "Jyothika", songs: ["Devuda Devuda", "Kokku Para Para"] },
  { movie: "Petta", year: 2019, hero: "Rajinikanth", heroine: "Trisha", songs: ["Marana Mass", "Petta Paraak", "Ullallaa"] },
  { movie: "Darbar", year: 2020, hero: "Rajinikanth", heroine: "Nayanthara", songs: ["Chumma Kizhi", "Thani Vazhi"] },
  { movie: "Kaala", year: 2018, hero: "Rajinikanth", heroine: "Huma Qureshi", songs: ["Semiya", "Katravai Patravai", "Thanga Sela"] },
  { movie: "Vettaiyan", year: 2024, hero: "Rajinikanth", heroine: "Manju Warrier", songs: ["Manasilaayo"] },
  { movie: "Baasha", year: 1995, hero: "Rajinikanth", heroine: "Nagma", songs: ["Naan Autokaaran"] },

  // ---------- Kamal Haasan & Vikram ----------
  { movie: "Anniyan", year: 2005, hero: "Vikram", heroine: "Sadha", songs: ["Kadhal Yaanai", "Iyengaru Veetu Azhage", "Andangkaaka"] },
  { movie: "I", year: 2015, hero: "Vikram", heroine: "Amy Jackson", songs: ["Mersalaayitten", "Pookkalae Sattru Oyivedungal", "Ennodu Nee Irundhaal"] },
  { movie: "Ponniyin Selvan: Part 1", year: 2022, hero: "Vikram", heroine: "Aishwarya Rai Bachchan", songs: ["Ponni Nadhi", "Chola Chola", "Ratchasa Maamaney"] },
  { movie: "Ponniyin Selvan: Part 2", year: 2023, hero: "Vikram", heroine: "Aishwarya Rai Bachchan", songs: ["Aga Naga", "Veera Raja Veera", "Chinnanjiru Nilave"] },
  { movie: "Vettaiyaadu Vilaiyaadu", year: 2006, hero: "Kamal Haasan", heroine: "Jyothika", songs: ["Karka Karka", "Partha Mudhal Naale", "Manjal Veyil"] },
  { movie: "Indian", year: 1996, hero: "Kamal Haasan", heroine: "Manisha Koirala", songs: ["Akadanu Naanga", "Telephone Manipol", "Maya Machindra"] },
  { movie: "Dasavathaaram", year: 2008, hero: "Kamal Haasan", heroine: "Asin", songs: ["Kallai Mattum Kandal", "Ulaga Nayagan"] },
  { movie: "Vikram", year: 2022, hero: "Kamal Haasan", heroine: "Gayathrie Shankar", songs: ["Pathala Pathala", "Porkanda Singam", "Once Upon a Time"] },
  { movie: "Nayakan", year: 1987, hero: "Kamal Haasan", heroine: "Saranya Ponvannan", songs: ["Nee Oru Kadhal Sangeetham", "Andhi Mazhai Pozhigiradhu"] },
  { movie: "Vishwaroopam", year: 2013, hero: "Kamal Haasan", heroine: "Pooja Kumar", songs: ["Vishwaroopam"] },

  // ---------- Suriya ----------
  { movie: "Kaakha Kaakha", year: 2003, hero: "Suriya", heroine: "Jyothika", songs: ["Ennai Konjam Matri", "Ondra Renda", "Thoodhu Varuma"] },
  { movie: "Ghajini", year: 2005, hero: "Suriya", heroine: "Asin", songs: ["Suttum Vizhi", "Oru Maalai", "X Machi"] },
  { movie: "Vaaranam Aayiram", year: 2008, hero: "Suriya", heroine: "Sameera Reddy", songs: ["Ava Enna", "Nenjukkul Peidhidum", "Mundhinam Parthene"] },
  { movie: "Ayan", year: 2009, hero: "Suriya", heroine: "Tamannaah", songs: ["Vizhi Moodi", "Nenje Nenje", "Pala Pala"] },
  { movie: "7aum Arivu", year: 2011, hero: "Suriya", heroine: "Shruti Haasan", songs: ["Oh Ringa Ringa", "Mun Andhi"] },
  { movie: "Maattrraan", year: 2012, hero: "Suriya", heroine: "Kajal Aggarwal", songs: ["Kaal Mulaitha Poovae"] },
  { movie: "Singam", year: 2010, hero: "Suriya", heroine: "Anushka Shetty", songs: ["Kadhal Vandhale"] },
  { movie: "24", year: 2016, hero: "Suriya", heroine: "Samantha", songs: ["Kaalam Yen Kadhali", "Naan Un Azhaginile", "Mei Nigara"] },
  { movie: "Soorarai Pottru", year: 2020, hero: "Suriya", heroine: "Aparna Balamurali", songs: ["Kaattu Payale", "Mannurunda", "Maara Theme"] },
  { movie: "Aayutha Ezhuthu", year: 2004, hero: "Suriya", heroine: "Meera Jasmine", songs: ["Sandakkozhi", "Yakkai Thiri", "Hey Goodbye Nanba"] },
  { movie: "Sillunu Oru Kaadhal", year: 2006, hero: "Suriya", heroine: "Bhumika Chawla", songs: ["Munbe Vaa"] },

  // ---------- Karthi ----------
  { movie: "Paiyaa", year: 2010, hero: "Karthi", heroine: "Tamannaah", songs: ["En Kadhal Solla", "Poongatre Poongatre", "Adada Mazhaida"] },
  { movie: "Aayirathil Oruvan", year: 2010, hero: "Karthi", heroine: "Reema Sen", songs: ["Oh Eesa", "Un Mela Aasadhan", "Indha Ponnungale"] },
  { movie: "Madras", year: 2014, hero: "Karthi", heroine: "Catherine Tresa", songs: ["Naan Nee", "Kaagitha Kappal", "Irandhidhu Kaalam"] },
  { movie: "Paruthiveeran", year: 2007, hero: "Karthi", heroine: "Priyamani", songs: ["Ore Oru Oorilae"] },

  // ---------- Dhanush ----------
  { movie: "Yaaradi Nee Mohini", year: 2008, hero: "Dhanush", heroine: "Nayanthara", songs: ["Oh Baby", "Venmegam", "Engeyo Paartha"] },
  { movie: "Anegan", year: 2015, hero: "Dhanush", heroine: "Amyra Dastur", songs: ["Danga Maari Oodhari", "Roja Kadale", "YOLO"] },
  { movie: "Maari", year: 2015, hero: "Dhanush", heroine: "Kajal Aggarwal", songs: ["Don'u Don'u", "Maari Thara Local", "Bagulu Odayum"] },
  { movie: "Velaiilla Pattadhari", year: 2014, hero: "Dhanush", heroine: "Amala Paul", songs: ["Amma Amma", "Udhungada Sangu", "Po Indru Neeyaga"] },
  { movie: "Asuran", year: 2019, hero: "Dhanush", heroine: "Manju Warrier", songs: ["Ellu Vaya Pookalaye"] },
  { movie: "Thiruchitrambalam", year: 2022, hero: "Dhanush", heroine: "Nithya Menen", songs: ["Thenmozhi", "Mayakkama Kalakkama", "Life of Pazham"] },
  { movie: "Karnan", year: 2021, hero: "Dhanush", heroine: "Rajisha Vijayan", songs: ["Kandaa Vara Sollunga"] },
  { movie: "Pudhupettai", year: 2006, hero: "Dhanush", heroine: "Sneha", songs: ["Oru Naalil", "Neruppu Vaayinil"] },
  { movie: "Aadukalam", year: 2011, hero: "Dhanush", heroine: "Taapsee Pannu", songs: ["Yathe Yathe"] },
  { movie: "Maryan", year: 2013, hero: "Dhanush", heroine: "Parvathy Thiruvothu", songs: ["Nenjae Ezhu"] },
  { movie: "Vada Chennai", year: 2018, hero: "Dhanush", heroine: "Aishwarya Rajesh", songs: ["Kaarkuzhal Kadavaiye", "Ennadi Maayavi Nee"] },
  { movie: "Enai Noki Paayum Thota", year: 2019, hero: "Dhanush", heroine: "Megha Akash", songs: ["Maruvaarthai", "Visiri", "Thirudaadhe"] },
  { movie: "Raayan", year: 2024, hero: "Dhanush", heroine: "Dushara Vijayan", songs: ["Water Packet"] },

  // ---------- Vijay Sethupathi & Madhavan ----------
  { movie: "96", year: 2018, hero: "Vijay Sethupathi", heroine: "Trisha", songs: ["Kaathalae Kaathalae", "Anthaathi", "Vaarthai Thavari"] },
  { movie: "Vikram Vedha", year: 2017, hero: "R. Madhavan", heroine: "Shraddha Srinath", songs: ["Yaanji", "Karuppu Vellai", "Tasakku Tasakku"] },
  { movie: "Naanum Rowdy Dhaan", year: 2015, hero: "Vijay Sethupathi", heroine: "Nayanthara", songs: ["Thangamey", "Neeyum Naanum"] },
  { movie: "Alaipayuthey", year: 2000, hero: "R. Madhavan", heroine: "Shalini", songs: ["Pachai Nirame", "Kadhal Sadugudu", "Snehithane"] },
  { movie: "Minnale", year: 2001, hero: "R. Madhavan", heroine: "Reema Sen", songs: ["Vaseegara", "Ivan Yaaro"] },
  { movie: "Kannathil Muthamittal", year: 2002, hero: "R. Madhavan", heroine: "Simran", songs: ["Vellai Pookal", "Signore Signore"] },

  // ---------- Mani Ratnam classics ----------
  { movie: "Roja", year: 1992, hero: "Arvind Swamy", heroine: "Madhoo", songs: ["Kadhal Rojave", "Chinna Chinna Aasai", "Rukkumani Rukkumani"] },
  { movie: "Bombay", year: 1995, hero: "Arvind Swamy", heroine: "Manisha Koirala", songs: ["Kannalane", "Uyire Uyire", "Poovukkenna Poottu"] },

  // ---------- Action / masala ----------
  { movie: "Mudhalvan", year: 1999, hero: "Arjun Sarja", heroine: "Manisha Koirala", songs: ["Shakalaka Baby", "Uppu Karuvadu", "Kurukku Siruthavale"] },
  { movie: "Gentleman", year: 1993, hero: "Arjun Sarja", heroine: "Madhoo", songs: ["Chikku Bukku Rayile", "Ottagathai Kattiko", "Usilampatti Penkutti"] },

  // ---------- Youth / romance ----------
  { movie: "Boys", year: 2003, hero: "Siddharth", heroine: "Genelia D'Souza", songs: ["Girl Friend", "Dating", "Boom Boom"] },
  { movie: "Mouna Ragam", year: 1986, hero: "Mohan", heroine: "Revathi", songs: ["Nilaave Vaa", "Chinna Chinna Vanna Kuyil", "Mandram Vandha Thendralukku"] },
  { movie: "Agni Natchathiram", year: 1988, hero: "Karthik", heroine: "Amala Akkineni", songs: ["Raaja Raajathi", "Ninnukori Varnam", "Vaa Vaa Anbe Anbe"] },
  { movie: "Kadhalan", year: 1994, hero: "Prabhu Deva", heroine: "Nagma", songs: ["Mukkala Muqabla", "Kadhalikkum Pennin"] },
  { movie: "Jeans", year: 1998, hero: "Prashanth", heroine: "Aishwarya Rai Bachchan", songs: ["Kannodu Kanbathellam", "Poovukkul", "Columbus"] },
  { movie: "Unnale Unnale", year: 2007, hero: "Vinay Rai", heroine: "Tanisha Mukherjee", songs: ["June Ponal", "Vaarayo Vennilave", "Mudhal Mazhai"] },
  { movie: "Kaadhal", year: 2004, hero: "Bharath", heroine: "Sandhya", songs: ["Kaadhal Vandhadhum"] },
  { movie: "Vinnaithaandi Varuvaayaa", year: 2010, hero: "Silambarasan", heroine: "Trisha", songs: ["Hosanna", "Omana Penne", "Kannukkul Kannai"] },
  { movie: "Achcham Yenbadhu Madamaiyada", year: 2016, hero: "Silambarasan", heroine: "Manjima Mohan", songs: ["Thalli Pogathey", "Rasaali", "Showkali"] },
  { movie: "Chekka Chivantha Vaanam", year: 2018, hero: "Silambarasan", heroine: "Aishwarya Rajesh", songs: ["Mazhai Kuruvi"] },
  { movie: "OK Kanmani", year: 2015, hero: "Dulquer Salmaan", heroine: "Nithya Menen", songs: ["Mental Manadhil", "Kaara Aattakkaaraa", "Malargal Kaettaen"] },

  // ---------- Sivakarthikeyan & friends ----------
  { movie: "Remo", year: 2016, hero: "Sivakarthikeyan", heroine: "Keerthy Suresh", songs: ["Senjitaley", "Remo Nee Kadhalan", "Sirikkadhey"] },
  { movie: "Doctor", year: 2021, hero: "Sivakarthikeyan", heroine: "Priyanka Arul Mohan", songs: ["Chellamma", "Nenjame", "So Baby"] },
  { movie: "Don", year: 2022, hero: "Sivakarthikeyan", heroine: "Priyanka Arul Mohan", songs: ["Jalabulajangu"] },
  { movie: "Velaikkaran", year: 2017, hero: "Sivakarthikeyan", heroine: "Nayanthara", songs: ["Karuthavanlaam Galeejam", "Iraiva"] },
  { movie: "Ayalaan", year: 2024, hero: "Sivakarthikeyan", heroine: "Rakul Preet Singh", songs: ["Maanja Nee"] },
  { movie: "Amaran", year: 2024, hero: "Sivakarthikeyan", heroine: "Sai Pallavi", songs: ["Uyirey", "Vennilavu Saaral"] },
  { movie: "Madharaasi", year: 2025, hero: "Sivakarthikeyan", heroine: "Rukmini Vasanth", songs: ["Sawadeeka"] },
  { movie: "Thani Oruvan", year: 2015, hero: "Ravi Mohan", heroine: "Nayanthara", songs: ["Kannala Kannala"] },
  { movie: "Ko", year: 2011, hero: "Jiiva", heroine: "Karthika Nair", songs: ["Ennamo Yedho"] },
  { movie: "Pariyerum Perumal", year: 2018, hero: "Kathir", heroine: "Anandhi", songs: ["Karuppi"] },
];

/**
 * A library row plus the stable id a question is pinned to. Derived once at
 * load time, so the hand-written entries above stay untouched.
 */
export type MovieRecord = MovieEntry & { id: string };

/** The four parts of a question, mirrored from the server's category list. */
export type AnswerCategory = "hero" | "heroine" | "movie" | "song";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Every library entry with its stable `id`, in dataset order. */
export const MOVIE_LIBRARY: MovieRecord[] = MOVIE_DATASET.map((entry) => ({
  ...entry,
  id: `${slugify(entry.movie) || slugify(String(entry.year))}-${entry.year}`,
}));

/** The library row a question was built from, if it is still in the book. */
export function findMovieById(id: string): MovieRecord | null {
  return MOVIE_LIBRARY.find((entry) => entry.id === id) ?? null;
}

/* ------------------------------------------------------------------ */
/* Approved aliases                                                    */
/* ------------------------------------------------------------------ */

/**
 * Extra spellings people genuinely use for an actor or actress. Only forms
 * that are real alternate names for the SAME person are listed — nothing that
 * could be mistaken for a different artist.
 */
const PERSON_ALIASES: Record<string, string[]> = {
  Vijay: ["Thalapathy Vijay", "Thalapathy"],
  Trisha: ["Trisha Krishnan"],
  "Trisha Krishnan": ["Trisha"],
  "Jyothika": ["Jothika"],
  Samantha: ["Samantha Akkineni", "Samantha Ruth Prabhu"],
  "Nayanthara": ["Nayantara"],
  "R. Madhavan": ["Madhavan", "R Madhavan", "R.Madhavan"],
  "Vijay Sethupathi": ["Sethupathi"],
  Rajinikanth: ["Rajini", "Superstar Rajinikanth", "Rajinikanth Sivaji"],
  "Kamal Haasan": ["Kamal", "Kamal Haasan", "Kamalhassan"],
  Suriya: ["Surya"],
};

/** Alternate titles and shortened forms of a film. */
const MOVIE_ALIASES: Record<string, string[]> = {
  "Ponniyin Selvan: Part 1": ["Ponniyin Selvan", "PS1", "Ponniyin Selvan 1"],
  "Ponniyin Selvan: Part 2": ["Ponniyin Selvan", "PS2", "Ponniyin Selvan 2"],
  "7aum Arivu": ["7 Aum Arivu", "Aum Arivu", "7aum"],
  "Vinnaithaandi Varuvaayaa": ["Vinnaithaandi Varuvayaa", "VVV"],
  "Achcham Yenbadhu Madamaiyada": [
    "Acham Yenbadhu Madamaiyada",
    "Aynmadamaiyada",
  ],
  "OK Kanmani": ["O Kadhal Kanmani", "Ok Kanmani"],
  "Kandukondain Kandukondain": ["Kandukondain"],
  "The Greatest of All Time": ["GOAT", "The Goat"],
  "24": ["24 Kisses"],
  "I": ["I Movie"],
  "2.0": ["2"],
};

/**
 * Song spellings that differ from the printed title. Keys are compared after
 * normalisation, so case and spacing do not matter here.
 */
const SONG_ALIASES: Record<string, string[]> = {
  "Kabadi Kabadi": ["Kabaddi Kabaddi", "Kabadi Kabbadi"],
  "Mun Andhi": ["Munandhi", "Mun Andhiy"],
  "Yakkai Thiri": ["Yakka Thir"],
  "Don'u Don'u": ["Donu Donu", "Don U Don U"],
  "Vaanganna Vanakkanganna": ["Vaanganna Vanakkanganna"],
};

function aliasesForValue(
  value: string,
  table: Record<string, string[]>,
): string[] {
  const direct = table[value];
  if (direct) return direct;
  // "Ok Kanmani" should hit the "OK Kanmani" row just as easily.
  const key = Object.keys(table).find(
    (k) => k.toLowerCase() === value.toLowerCase(),
  );
  return key ? table[key] : [];
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (!value.trim() || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}

/**
 * The approved answer set for one question built from a library row.
 *
 * The stored answer is always accepted; these are the ONLY other spellings
 * that will pass validation.
 */
export function answerAliasesFor(
  entry: MovieEntry,
  song: string,
): Record<AnswerCategory, string[]> {
  return {
    hero: unique([...aliasesForValue(entry.hero, PERSON_ALIASES), entry.hero]),
    heroine: unique([
      ...aliasesForValue(entry.heroine, PERSON_ALIASES),
      entry.heroine,
    ]),
    movie: unique([...aliasesForValue(entry.movie, MOVIE_ALIASES), entry.movie]),
    song: unique([...aliasesForValue(song, SONG_ALIASES), song]),
  };
}

/** Alias set for a question someone typed in by hand rather than picking. */
export function typedAliases(
  values: Record<AnswerCategory, string>,
): Record<AnswerCategory, string[]> {
  return {
    hero: unique([values.hero]),
    heroine: unique([values.heroine]),
    movie: unique([values.movie]),
    song: unique([values.song]),
  };
}

/** Case-insensitive search over movie, hero and heroine. */
export function searchMovies(query: string, limit = 8): MovieRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return MOVIE_LIBRARY.slice(0, limit);
  return MOVIE_LIBRARY.filter(
    (entry) =>
      entry.movie.toLowerCase().includes(q) ||
      entry.hero.toLowerCase().includes(q) ||
      entry.heroine.toLowerCase().includes(q) ||
      String(entry.year).includes(q),
  ).slice(0, limit);
}

/** One song from the movie, chosen at random for each round. */
export function pickSong(entry: MovieEntry): string {
  return entry.songs[Math.floor(Math.random() * entry.songs.length)];
}
