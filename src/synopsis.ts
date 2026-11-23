// The synopsis outline: one row per pericope, with the reference in each Gospel
// that tells it. Chapters and verses are stored without the book name so the
// same table can render and query without string surgery.
//
// The shape follows the standard scholarly synopsis (Aland, Synopsis Quattuor
// Evangeliorum) but is grouped into readable parts rather than 367 fragments.
// Where the Gospels order an event differently, the note says so.

export type GospelId = "matthew" | "mark" | "luke" | "john";

export interface Gospel {
  id: GospelId;
  name: string;
  short: string;
  abbr: string;
  book: string;
  hue: string;
  soft: string;
}

export const GOSPELS: Gospel[] = [
  { id: "matthew", name: "Matthew", short: "Matt", abbr: "Mt", book: "Matthew", hue: "#e6be49", soft: "rgba(230, 190, 73, 0.13)" },
  { id: "mark", name: "Mark", short: "Mark", abbr: "Mk", book: "Mark", hue: "#8fb3c7", soft: "rgba(143, 179, 199, 0.13)" },
  { id: "luke", name: "Luke", short: "Luke", abbr: "Lk", book: "Luke", hue: "#c9906a", soft: "rgba(201, 144, 106, 0.13)" },
  { id: "john", name: "John", short: "John", abbr: "Jn", book: "John", hue: "#a99bd6", soft: "rgba(169, 155, 214, 0.13)" },
];

export const GOSPEL_BY_ID: Record<GospelId, Gospel> = Object.fromEntries(
  GOSPELS.map((g) => [g.id, g]),
) as Record<GospelId, Gospel>;

export interface Part {
  id: string;
  title: string;
  blurb: string;
}

export interface Section {
  id: string;
  title: string;
  part: string;
  passages: Partial<Record<GospelId, string>>;
  note?: string;
}

export const PARTS: Part[] = [
  { id: "prologue", title: "Prologue and Infancy", blurb: "The Word before time, and a child in Bethlehem." },
  { id: "preparation", title: "Preparation", blurb: "The wilderness, the baptism, the first disciples." },
  { id: "beginnings", title: "The Ministry Begins", blurb: "Cana to Capernaum: signs, teaching, a growing crowd." },
  { id: "galilee", title: "Galilee: Word and Deed", blurb: "The Sermon, the parables, the miracles, the mission." },
  { id: "journey", title: "Confession and Journey", blurb: "Who do you say I am? Then the long road south." },
  { id: "passion", title: "Passion Week", blurb: "Jerusalem: the entry, the table, the farewell." },
  { id: "cross", title: "Trial and Cross", blurb: "Six hearings, one sentence, Golgotha." },
  { id: "risen", title: "Risen and Sent", blurb: "Empty tomb, Emmaus, Galilee, the commission." },
];

export const SECTIONS: Section[] = [
  // ---- Prologue and Infancy -------------------------------------------------
  {
    id: "prologue",
    title: "Prologue",
    part: "prologue",
    passages: { matthew: "1:1", mark: "1:1", luke: "1:1-4", john: "1:1-18" },
    note: "Four doors into the same house: a genealogy, a bare announcement, a careful preface, and a hymn about the Word made flesh.",
  },
  { id: "john-promised", title: "The Promise of John the Baptist", part: "prologue", passages: { luke: "1:5-25" } },
  { id: "annunciation", title: "The Annunciation", part: "prologue", passages: { luke: "1:26-38" } },
  { id: "visitation", title: "Mary Visits Elizabeth", part: "prologue", passages: { luke: "1:39-56" } },
  { id: "birth-john", title: "The Birth of John the Baptist", part: "prologue", passages: { luke: "1:57-80" } },
  { id: "genealogy", title: "The Genealogy of Jesus", part: "prologue", passages: { matthew: "1:2-17", luke: "3:23-38" }, note: "Matthew traces the line forward from Abraham through Solomon; Luke traces it backward from Jesus to Adam." },
  { id: "birth-jesus", title: "The Birth of Jesus", part: "prologue", passages: { matthew: "1:18-25", luke: "2:1-7" } },
  { id: "shepherds", title: "The Shepherds", part: "prologue", passages: { luke: "2:8-20" } },
  { id: "magi", title: "The Magi from the East", part: "prologue", passages: { matthew: "2:1-12" } },
  { id: "presentation", title: "Circumcision and Presentation in the Temple", part: "prologue", passages: { luke: "2:21-38" } },
  { id: "egypt", title: "The Flight into Egypt", part: "prologue", passages: { matthew: "2:13-21" } },
  { id: "nazareth-return", title: "The Return to Nazareth", part: "prologue", passages: { matthew: "2:22-23", luke: "2:39-40" } },
  { id: "boy-temple", title: "The Boy Jesus in the Temple", part: "prologue", passages: { luke: "2:41-52" } },

  // ---- Preparation ---------------------------------------------------------
  {
    id: "john-baptist",
    title: "John the Baptist",
    part: "preparation",
    passages: { matthew: "3:1-6", mark: "1:2-6", luke: "3:1-6", john: "1:19-23" },
    note: "John's Gospel gives us the interrogations rather than the desert sermon; the Synoptics give the sermon.",
  },
  { id: "john-repentance", title: "John's Preaching of Repentance", part: "preparation", passages: { matthew: "3:7-10", luke: "3:7-9" } },
  { id: "john-questioners", title: "John Answers the Questioners", part: "preparation", passages: { luke: "3:10-14" } },
  { id: "john-messianic", title: "John's Messianic Preaching", part: "preparation", passages: { matthew: "3:11-12", mark: "1:7-8", luke: "3:15-18", john: "1:24-28" } },
  { id: "john-imprisoned", title: "The Imprisonment of John", part: "preparation", passages: { matthew: "14:3-5", mark: "6:17-20", luke: "3:19-20" } },
  { id: "baptism", title: "The Baptism of Jesus", part: "preparation", passages: { matthew: "3:13-17", mark: "1:9-11", luke: "3:21-22", john: "1:29-34" } },
  { id: "temptation", title: "The Temptation in the Wilderness", part: "preparation", passages: { matthew: "4:1-11", mark: "1:12-13", luke: "4:1-13" } },

  // ---- The Ministry Begins -------------------------------------------------
  { id: "first-disciples", title: "The Call of the First Disciples", part: "beginnings", passages: { john: "1:35-51" }, note: "John narrates the first meetings in Judea; the Synoptics narrate the call by the lake some months later (see 'The Call of the Fishermen')." },
  { id: "cana", title: "The Marriage at Cana", part: "beginnings", passages: { john: "2:1-11" } },
  { id: "capernaum", title: "The Sojourn at Capernaum", part: "beginnings", passages: { john: "2:12" } },
  {
    id: "cleansing-temple",
    title: "The Cleansing of the Temple",
    part: "beginnings",
    passages: { matthew: "21:12-13", mark: "11:15-17", luke: "19:45-46", john: "2:13-22" },
    note: "John places the cleansing at the start of the ministry; the Synoptics place it in Passion Week.",
  },
  { id: "nicodemus", title: "The Discourse with Nicodemus", part: "beginnings", passages: { john: "3:1-21" } },
  { id: "judea", title: "Jesus' Ministry in Judea", part: "beginnings", passages: { john: "3:22-24" } },
  { id: "john-testimony", title: "John's Testimony to Christ", part: "beginnings", passages: { john: "3:25-36" } },
  { id: "samaria", title: "The Woman of Samaria", part: "beginnings", passages: { john: "4:1-42" } },
  {
    id: "galilee-return",
    title: "The Return to Galilee",
    part: "beginnings",
    passages: { matthew: "4:12-17", mark: "1:14-15", luke: "4:14-15", john: "4:43-45" },
  },
  { id: "nazareth-rejection", title: "Rejected at Nazareth", part: "beginnings", passages: { matthew: "13:53-58", mark: "6:1-6", luke: "4:16-30" } },
  {
    id: "call-fishermen",
    title: "The Call of the Fishermen",
    part: "beginnings",
    passages: { matthew: "4:18-22", mark: "1:16-20", luke: "5:1-11" },
    note: "Luke turns the call into a catch of fish and a confession of sin; Matthew and Mark give it in a sentence.",
  },
  { id: "synagogue-capernaum", title: "Teaching in the Synagogue at Capernaum", part: "beginnings", passages: { mark: "1:21-22", luke: "4:31-32" } },
  { id: "demoniac-synagogue", title: "The Demoniac in the Synagogue", part: "beginnings", passages: { mark: "1:23-28", luke: "4:33-37" } },
  { id: "peters-mother", title: "The Healing of Peter's Mother-in-law", part: "beginnings", passages: { matthew: "8:14-15", mark: "1:29-31", luke: "4:38-39" } },
  { id: "evening-healings", title: "The Sick Healed at Evening", part: "beginnings", passages: { matthew: "8:16-17", mark: "1:32-34", luke: "4:40-41" } },
  { id: "departure", title: "Jesus Departs from Capernaum", part: "beginnings", passages: { mark: "1:35-38", luke: "4:42-43" } },
  { id: "tour", title: "The First Preaching Tour in Galilee", part: "beginnings", passages: { matthew: "4:23-25", mark: "1:39", luke: "4:44" } },
  { id: "leper", title: "The Cleansing of the Leper", part: "beginnings", passages: { matthew: "8:1-4", mark: "1:40-45", luke: "5:12-16" } },
  { id: "paralytic", title: "The Healing of the Paralytic", part: "beginnings", passages: { matthew: "9:1-8", mark: "2:1-12", luke: "5:17-26" } },
  { id: "levi", title: "The Call of Levi", part: "beginnings", passages: { matthew: "9:9-13", mark: "2:13-17", luke: "5:27-32" } },
  { id: "fasting", title: "The Question about Fasting", part: "beginnings", passages: { matthew: "9:14-17", mark: "2:18-22", luke: "5:33-39" } },
  { id: "grain-sabbath", title: "Plucking Grain on the Sabbath", part: "beginnings", passages: { matthew: "12:1-8", mark: "2:23-28", luke: "6:1-5" } },
  { id: "withered-hand", title: "The Man with the Withered Hand", part: "beginnings", passages: { matthew: "12:9-14", mark: "3:1-6", luke: "6:6-11" } },
  { id: "multitudes-sea", title: "Jesus Heals Multitudes by the Sea", part: "beginnings", passages: { matthew: "12:15-21", mark: "3:7-12", luke: "6:17-19" } },
  { id: "twelve", title: "The Choosing of the Twelve", part: "beginnings", passages: { matthew: "10:1-4", mark: "3:13-19", luke: "6:12-16" } },

  // ---- Galilee: Word and Deed ---------------------------------------------
  { id: "sermon-occasion", title: "The Setting of the Sermon", part: "galilee", passages: { matthew: "4:24-5:2", luke: "6:17-20" }, note: "Matthew sets the sermon on a mountain; Luke sets it on a level place, and includes woes Matthew does not." },
  { id: "beatitudes", title: "The Beatitudes", part: "galilee", passages: { matthew: "5:3-12", luke: "6:20-23" } },
  { id: "woes", title: "The Woes", part: "galilee", passages: { luke: "6:24-26" } },
  { id: "salt", title: "The Salt of the Earth", part: "galilee", passages: { matthew: "5:13", mark: "9:49-50", luke: "14:34-35" } },
  { id: "light", title: "The Light of the World", part: "galilee", passages: { matthew: "5:14-16", mark: "4:21", luke: "8:16" } },
  { id: "law", title: "On the Law and the Prophets", part: "galilee", passages: { matthew: "5:17-20", luke: "16:16-17" } },
  { id: "murder", title: "On Murder and Wrath", part: "galilee", passages: { matthew: "5:21-26", luke: "12:57-59" } },
  { id: "adultery", title: "On Adultery and Divorce", part: "galilee", passages: { matthew: "5:27-32", mark: "9:43-48", luke: "16:18" } },
  { id: "oaths", title: "On Oaths", part: "galilee", passages: { matthew: "5:33-37" } },
  { id: "retaliation", title: "On Retaliation", part: "galilee", passages: { matthew: "5:38-42", luke: "6:29-30" } },
  { id: "enemies", title: "On Love of Enemies", part: "galilee", passages: { matthew: "5:43-48", luke: "6:27-36" } },
  { id: "almsgiving", title: "On Almsgiving", part: "galilee", passages: { matthew: "6:1-4" } },
  { id: "prayer", title: "On Prayer", part: "galilee", passages: { matthew: "6:5-8" } },
  { id: "lords-prayer", title: "The Lord's Prayer", part: "galilee", passages: { matthew: "6:9-15", luke: "11:1-4" } },
  { id: "fasting-teaching", title: "On Fasting", part: "galilee", passages: { matthew: "6:16-18" } },
  { id: "treasures", title: "On Treasures", part: "galilee", passages: { matthew: "6:19-21", luke: "12:33-34" } },
  { id: "sound-eye", title: "The Sound Eye", part: "galilee", passages: { matthew: "6:22-23", luke: "11:34-36" } },
  { id: "two-masters", title: "On Serving Two Masters", part: "galilee", passages: { matthew: "6:24", luke: "16:13" } },
  { id: "anxiety", title: "On Anxiety", part: "galilee", passages: { matthew: "6:25-34", luke: "12:22-32" } },
  { id: "judging", title: "On Judging", part: "galilee", passages: { matthew: "7:1-5", luke: "6:37-42" } },
  { id: "holy", title: "On Profaning the Holy", part: "galilee", passages: { matthew: "7:6" } },
  { id: "asking", title: "God's Answering of Prayer", part: "galilee", passages: { matthew: "7:7-11", luke: "11:9-13" } },
  { id: "golden-rule", title: "The Golden Rule", part: "galilee", passages: { matthew: "7:12", luke: "6:31" } },
  { id: "two-ways", title: "The Two Ways", part: "galilee", passages: { matthew: "7:13-14", luke: "13:23-24" } },
  { id: "fruits", title: "By Their Fruits", part: "galilee", passages: { matthew: "7:15-20", luke: "6:43-45" } },
  { id: "lord-lord", title: "Saying 'Lord, Lord'", part: "galilee", passages: { matthew: "7:21-23", luke: "13:25-27" } },
  { id: "house-rock", title: "The House Built on the Rock", part: "galilee", passages: { matthew: "7:24-27", luke: "6:47-49" } },
  { id: "sermon-effect", title: "The Effect of the Sermon", part: "galilee", passages: { matthew: "7:28-29", mark: "1:21-22" } },
  {
    id: "centurion",
    title: "The Centurion of Capernaum",
    part: "galilee",
    passages: { matthew: "8:5-13", luke: "7:1-10", john: "4:46-54" },
    note: "John's parallel is the royal official whose son was healed at Cana; Matthew and Luke tell of a centurion's servant at Capernaum.",
  },
  { id: "nain", title: "The Widow's Son at Nain", part: "galilee", passages: { luke: "7:11-17" } },
  { id: "storm", title: "Stilling the Storm", part: "galilee", passages: { matthew: "8:23-27", mark: "4:35-41", luke: "8:22-25" } },
  { id: "gadarene", title: "The Gadarene Demoniacs", part: "galilee", passages: { matthew: "8:28-34", mark: "5:1-20", luke: "8:26-39" } },
  { id: "jairus", title: "Jairus' Daughter and the Woman with a Hemorrhage", part: "galilee", passages: { matthew: "9:18-26", mark: "5:21-43", luke: "8:40-56" } },
  { id: "two-blind", title: "Two Blind Men", part: "galilee", passages: { matthew: "9:27-31" } },
  { id: "dumb-demoniac", title: "The Dumb Demoniac", part: "galilee", passages: { matthew: "9:32-34", mark: "3:22", luke: "11:14-15" } },
  { id: "harvest", title: "The Harvest Is Great", part: "galilee", passages: { matthew: "9:35-38", mark: "6:6", luke: "8:1" } },
  { id: "commissioning", title: "Commissioning the Twelve", part: "galilee", passages: { matthew: "10:5-16", mark: "6:6-13", luke: "9:1-6" } },
  { id: "fate-disciples", title: "The Fate of the Disciples", part: "galilee", passages: { matthew: "10:17-25", mark: "13:9-13", luke: "21:12-19" } },
  { id: "fearless", title: "Exhortation to Fearless Confession", part: "galilee", passages: { matthew: "10:26-33", luke: "12:2-9" } },
  { id: "divisions", title: "Divisions within Households", part: "galilee", passages: { matthew: "10:34-36", luke: "12:51-53" } },
  { id: "conditions", title: "Conditions of Discipleship", part: "galilee", passages: { matthew: "10:37-39", luke: "14:25-27", john: "12:25" } },
  { id: "rewards", title: "Rewards of Discipleship", part: "galilee", passages: { matthew: "10:40-42", mark: "9:41", luke: "10:16", john: "13:20" } },
  { id: "john-question", title: "John the Baptist's Question", part: "galilee", passages: { matthew: "11:2-6", luke: "7:18-23" } },
  { id: "witness-john", title: "Jesus' Witness concerning John", part: "galilee", passages: { matthew: "11:7-19", luke: "7:24-35" } },
  { id: "woes-cities", title: "Woes on the Galilean Cities", part: "galilee", passages: { matthew: "11:20-24", luke: "10:12-15" } },
  { id: "thanksgiving", title: "Jesus' Thanksgiving to the Father", part: "galilee", passages: { matthew: "11:25-27", luke: "10:21-22" } },
  { id: "come-unto-me", title: "Come unto Me", part: "galilee", passages: { matthew: "11:28-30" } },
  { id: "ministering-women", title: "The Ministering Women", part: "galilee", passages: { luke: "8:1-3" } },
  { id: "beside-himself", title: "Jesus Is Thought to Be Beside Himself", part: "galilee", passages: { mark: "3:20-21" } },
  { id: "beelzebub", title: "On Collusion with Satan", part: "galilee", passages: { matthew: "12:22-30", mark: "3:22-27", luke: "11:14-23" } },
  { id: "unforgivable", title: "The Sin against the Holy Spirit", part: "galilee", passages: { matthew: "12:31-37", mark: "3:28-30", luke: "12:10" } },
  { id: "sign-jonah", title: "The Sign of Jonah", part: "galilee", passages: { matthew: "12:38-42", mark: "8:11-12", luke: "11:29-32" } },
  { id: "evil-spirit", title: "The Return of the Evil Spirit", part: "galilee", passages: { matthew: "12:43-45", luke: "11:24-26" } },
  { id: "true-kindred", title: "Jesus' True Kindred", part: "galilee", passages: { matthew: "12:46-50", mark: "3:31-35", luke: "8:19-21" } },
  { id: "sower", title: "The Parable of the Sower", part: "galilee", passages: { matthew: "13:1-9", mark: "4:1-9", luke: "8:4-8" } },
  { id: "why-parables", title: "The Reason for Speaking in Parables", part: "galilee", passages: { matthew: "13:10-17", mark: "4:10-12", luke: "8:9-10" } },
  { id: "sower-explained", title: "The Sower Explained", part: "galilee", passages: { matthew: "13:18-23", mark: "4:13-20", luke: "8:11-15" } },
  { id: "ears-hear", title: "He Who Has Ears, Let Him Hear", part: "galilee", passages: { mark: "4:21-25", luke: "8:16-18" } },
  { id: "seed-growing", title: "The Seed Growing Secretly", part: "galilee", passages: { mark: "4:26-29" } },
  { id: "tares", title: "The Parable of the Tares", part: "galilee", passages: { matthew: "13:24-30" } },
  { id: "mustard", title: "The Parable of the Mustard Seed", part: "galilee", passages: { matthew: "13:31-32", mark: "4:30-32", luke: "13:18-19" } },
  { id: "leaven", title: "The Parable of the Leaven", part: "galilee", passages: { matthew: "13:33", luke: "13:20-21" } },
  { id: "parables-fulfilled", title: "Jesus' Use of Parables", part: "galilee", passages: { matthew: "13:34-35", mark: "4:33-34" } },
  { id: "tares-explained", title: "The Tares Explained", part: "galilee", passages: { matthew: "13:36-43" } },
  { id: "treasure-pearl", title: "The Hidden Treasure and the Pearl", part: "galilee", passages: { matthew: "13:44-46" } },
  { id: "net", title: "The Parable of the Net", part: "galilee", passages: { matthew: "13:47-50" } },
  { id: "treasures-new", title: "Treasures New and Old", part: "galilee", passages: { matthew: "13:51-52" } },
  { id: "death-john", title: "The Death of John the Baptist", part: "galilee", passages: { matthew: "14:6-12", mark: "6:21-29" } },
  { id: "apostles-return", title: "The Return of the Apostles", part: "galilee", passages: { mark: "6:30-31", luke: "9:10" } },
  { id: "feeding-5000", title: "Five Thousand Are Fed", part: "galilee", passages: { matthew: "14:13-21", mark: "6:32-44", luke: "9:10-17", john: "6:1-15" } },
  { id: "walking-water", title: "The Walking on the Water", part: "galilee", passages: { matthew: "14:22-33", mark: "6:45-52", john: "6:16-21" } },
  { id: "gennesaret", title: "Healings at Gennesaret", part: "galilee", passages: { matthew: "14:34-36", mark: "6:53-56" } },
  { id: "bread-life", title: "The Bread of Life", part: "galilee", passages: { john: "6:22-59" } },
  { id: "defilement", title: "Defilement: Traditional and Real", part: "galilee", passages: { matthew: "15:1-20", mark: "7:1-23", luke: "11:37-41" } },
  { id: "syrophoenician", title: "The Syrophoenician Woman", part: "galilee", passages: { matthew: "15:21-28", mark: "7:24-30" } },
  { id: "deaf-mute", title: "The Deaf Mute Healed", part: "galilee", passages: { matthew: "15:29-31", mark: "7:31-37" } },
  { id: "feeding-4000", title: "Four Thousand Are Fed", part: "galilee", passages: { matthew: "15:32-39", mark: "8:1-10" } },
  { id: "seek-sign", title: "The Pharisees Seek a Sign", part: "galilee", passages: { matthew: "16:1-4", mark: "8:11-13", luke: "12:54-56" } },
  { id: "leaven-pharisees", title: "The Leaven of the Pharisees", part: "galilee", passages: { matthew: "16:5-12", mark: "8:14-21", luke: "12:1" } },
  { id: "blind-bethsaida", title: "A Blind Man Healed at Bethsaida", part: "galilee", passages: { mark: "8:22-26" } },

  // ---- Confession and Journey ---------------------------------------------
  { id: "peters-confession", title: "Peter's Confession", part: "journey", passages: { matthew: "16:13-20", mark: "8:27-30", luke: "9:18-21" } },
  { id: "first-passion", title: "The First Prediction of the Passion", part: "journey", passages: { matthew: "16:21-23", mark: "8:31-33", luke: "9:22" } },
  { id: "take-up-cross", title: "Take Up Your Cross", part: "journey", passages: { matthew: "16:24-28", mark: "8:34-9:1", luke: "9:23-27" } },
  { id: "transfiguration", title: "The Transfiguration", part: "journey", passages: { matthew: "17:1-8", mark: "9:2-8", luke: "9:28-36" } },
  { id: "elijah-question", title: "The Question about Elijah", part: "journey", passages: { matthew: "17:9-13", mark: "9:9-13" } },
  { id: "epileptic", title: "The Epileptic Boy Healed", part: "journey", passages: { matthew: "17:14-21", mark: "9:14-29", luke: "9:37-43" } },
  { id: "second-passion", title: "The Second Prediction of the Passion", part: "journey", passages: { matthew: "17:22-23", mark: "9:30-32", luke: "9:43-45" } },
  { id: "temple-tax", title: "The Temple Tax", part: "journey", passages: { matthew: "17:24-27" } },
  { id: "greatest", title: "Who Is the Greatest?", part: "journey", passages: { matthew: "18:1-5", mark: "9:33-37", luke: "9:46-48" } },
  { id: "strange-exorcist", title: "The Strange Exorcist", part: "journey", passages: { mark: "9:38-41", luke: "9:49-50" } },
  { id: "stumbling", title: "On Stumbling Blocks", part: "journey", passages: { matthew: "18:6-9", mark: "9:42-48", luke: "17:1-2" } },
  { id: "lost-sheep", title: "The Lost Sheep", part: "journey", passages: { matthew: "18:10-14", luke: "15:3-7" } },
  { id: "brother-sins", title: "The Brother Who Sins", part: "journey", passages: { matthew: "18:15-20" } },
  { id: "forgiveness", title: "On Forgiveness", part: "journey", passages: { matthew: "18:21-22", luke: "17:3-4" } },
  { id: "unmerciful-servant", title: "The Unmerciful Servant", part: "journey", passages: { matthew: "18:23-35" } },
  { id: "samaritan-village", title: "The Samaritan Village", part: "journey", passages: { luke: "9:51-56" } },
  { id: "would-be", title: "Would-Be Followers", part: "journey", passages: { matthew: "8:19-22", luke: "9:57-62" } },
  { id: "seventy", title: "The Mission of the Seventy", part: "journey", passages: { luke: "10:1-16" } },
  { id: "seventy-return", title: "The Return of the Seventy", part: "journey", passages: { luke: "10:17-20" } },
  { id: "good-samaritan", title: "The Good Samaritan", part: "journey", passages: { luke: "10:25-37" } },
  { id: "martha-mary", title: "Mary and Martha", part: "journey", passages: { luke: "10:38-42" } },
  { id: "friend-midnight", title: "The Friend at Midnight", part: "journey", passages: { luke: "11:5-8" } },
  { id: "lamp-body", title: "The Lamp of the Body", part: "journey", passages: { luke: "11:33-36" } },
  { id: "woes-pharisees", title: "Woes to the Pharisees", part: "journey", passages: { luke: "11:37-54" } },
  { id: "hypocrisy", title: "The Leaven of the Pharisees", part: "journey", passages: { luke: "12:1-3" } },
  { id: "fear-god", title: "Fear God, Not Men", part: "journey", passages: { luke: "12:4-7" } },
  { id: "confess-christ", title: "Confessing Christ", part: "journey", passages: { luke: "12:8-12" } },
  { id: "rich-fool", title: "The Rich Fool", part: "journey", passages: { luke: "12:13-21" } },
  { id: "watchful", title: "The Watchful Servants", part: "journey", passages: { luke: "12:35-48" } },
  { id: "division", title: "Division and Fire", part: "journey", passages: { luke: "12:49-53" } },
  { id: "signs-times", title: "Reading the Signs of the Times", part: "journey", passages: { luke: "12:54-56" } },
  { id: "galileans", title: "The Galileans and the Tower of Siloam", part: "journey", passages: { luke: "13:1-5" } },
  { id: "barren-fig", title: "The Barren Fig Tree", part: "journey", passages: { luke: "13:6-9" } },
  { id: "crippled-woman", title: "The Crippled Woman Healed", part: "journey", passages: { luke: "13:10-17" } },
  { id: "narrow-door", title: "The Narrow Door", part: "journey", passages: { luke: "13:22-30" } },
  { id: "lament-jerusalem", title: "The Lament over Jerusalem", part: "journey", passages: { luke: "13:31-35" } },
  { id: "dropsy", title: "The Man with Dropsy Healed", part: "journey", passages: { luke: "14:1-6" } },
  { id: "places-honor", title: "The Places of Honor", part: "journey", passages: { luke: "14:7-14" } },
  { id: "great-banquet", title: "The Great Banquet", part: "journey", passages: { luke: "14:15-24" } },
  { id: "counting-cost", title: "Counting the Cost", part: "journey", passages: { luke: "14:25-35" } },
  { id: "lost-things", title: "The Lost Sheep, Coin, and Sons", part: "journey", passages: { luke: "15:1-32" } },
  { id: "dishonest-manager", title: "The Dishonest Manager", part: "journey", passages: { luke: "16:1-13" } },
  { id: "law-pharisees", title: "The Law and the Pharisees", part: "journey", passages: { luke: "16:14-18" } },
  { id: "rich-lazarus", title: "The Rich Man and Lazarus", part: "journey", passages: { luke: "16:19-31" } },
  { id: "unprofitable", title: "Unprofitable Servants", part: "journey", passages: { luke: "17:7-10" } },
  { id: "ten-lepers", title: "The Ten Lepers", part: "journey", passages: { luke: "17:11-19" } },
  { id: "kingdom-coming", title: "The Coming of the Kingdom", part: "journey", passages: { luke: "17:20-37" } },
  { id: "persistent-widow", title: "The Persistent Widow", part: "journey", passages: { luke: "18:1-8" } },
  { id: "pharisee-publican", title: "The Pharisee and the Tax Collector", part: "journey", passages: { luke: "18:9-14" } },
  { id: "divorce", title: "On Divorce", part: "journey", passages: { matthew: "19:1-12", mark: "10:1-12" } },
  { id: "children", title: "Blessing the Little Children", part: "journey", passages: { matthew: "19:13-15", mark: "10:13-16", luke: "18:15-17" } },
  { id: "rich-ruler", title: "The Rich Young Ruler", part: "journey", passages: { matthew: "19:16-30", mark: "10:17-31", luke: "18:18-30" } },
  { id: "laborers", title: "The Laborers in the Vineyard", part: "journey", passages: { matthew: "20:1-16" } },
  { id: "third-passion", title: "The Third Prediction of the Passion", part: "journey", passages: { matthew: "20:17-19", mark: "10:32-34", luke: "18:31-34" } },
  { id: "zebedee", title: "The Request of the Zebedee Brothers", part: "journey", passages: { matthew: "20:20-28", mark: "10:35-45" } },
  { id: "bartimaeus", title: "Blind Bartimaeus", part: "journey", passages: { matthew: "20:29-34", mark: "10:46-52", luke: "18:35-43" } },
  { id: "zacchaeus", title: "Zacchaeus", part: "journey", passages: { luke: "19:1-10" } },
  {
    id: "talents",
    title: "The Talents and the Minas",
    part: "journey",
    passages: { matthew: "25:14-30", luke: "19:11-27" },
    note: "Matthew tells of talents given to three servants; Luke tells of ten minas given to ten, with a rebellious delegation thrown in. Same story, different telling.",
  },
  { id: "lazarus", title: "The Raising of Lazarus", part: "journey", passages: { john: "11:1-44" } },
  { id: "plot", title: "The Plot against Jesus", part: "journey", passages: { john: "11:45-53" } },
  { id: "ephraim", title: "The Withdrawal to Ephraim", part: "journey", passages: { john: "11:54-57" } },

  // ---- Passion Week --------------------------------------------------------
  { id: "anointing-bethany", title: "The Anointing at Bethany", part: "passion", passages: { matthew: "26:6-13", mark: "14:3-9", john: "12:1-8" }, note: "Luke 7:36-50 tells of a sinful woman anointing Jesus in Galilee; John has Mary of Bethany anoint him six days before Passover." },
  { id: "triumphal-entry", title: "The Triumphal Entry", part: "passion", passages: { matthew: "21:1-11", mark: "11:1-11", luke: "19:28-40", john: "12:12-19" } },
  { id: "greeks", title: "The Greeks Seek Jesus", part: "passion", passages: { john: "12:20-26" } },
  { id: "voice-heaven", title: "The Voice from Heaven", part: "passion", passages: { john: "12:27-36" } },
  { id: "unbelief", title: "The Unbelief of the People", part: "passion", passages: { john: "12:37-43" } },
  { id: "judgment-unbelief", title: "The Judgment of Unbelief", part: "passion", passages: { john: "12:44-50" } },
  { id: "fig-tree", title: "The Fig Tree Cursed", part: "passion", passages: { matthew: "21:18-19", mark: "11:12-14" } },
  { id: "fig-withered", title: "The Fig Tree Withered", part: "passion", passages: { matthew: "21:20-22", mark: "11:20-25" } },
  { id: "authority", title: "The Question about Authority", part: "passion", passages: { matthew: "21:23-27", mark: "11:27-33", luke: "20:1-8" } },
  { id: "tenants", title: "The Wicked Tenants", part: "passion", passages: { matthew: "21:33-46", mark: "12:1-12", luke: "20:9-19" } },
  { id: "wedding-banquet", title: "The Wedding Banquet", part: "passion", passages: { matthew: "22:1-14" } },
  { id: "tribute", title: "Tribute to Caesar", part: "passion", passages: { matthew: "22:15-22", mark: "12:13-17", luke: "20:20-26" } },
  { id: "resurrection-question", title: "The Question about the Resurrection", part: "passion", passages: { matthew: "22:23-33", mark: "12:18-27", luke: "20:27-40" } },
  { id: "greatest-command", title: "The Greatest Commandment", part: "passion", passages: { matthew: "22:34-40", mark: "12:28-34" } },
  { id: "son-david", title: "The Son of David", part: "passion", passages: { matthew: "22:41-46", mark: "12:35-37", luke: "20:41-44" } },
  { id: "scribes-denounced", title: "The Scribes and Pharisees Denounced", part: "passion", passages: { matthew: "23:1-36", mark: "12:38-40", luke: "20:45-47" } },
  { id: "widows-mite", title: "The Widow's Mite", part: "passion", passages: { mark: "12:41-44", luke: "21:1-4" } },
  { id: "olivet-sign", title: "The Sign of the End", part: "passion", passages: { matthew: "24:1-3", mark: "13:1-4", luke: "21:5-7" } },
  { id: "woes-begin", title: "The Beginning of the Woes", part: "passion", passages: { matthew: "24:4-14", mark: "13:5-13", luke: "21:8-19" } },
  { id: "abomination", title: "The Abomination of Desolation", part: "passion", passages: { matthew: "24:15-28", mark: "13:14-23", luke: "21:20-24" } },
  { id: "coming-son-man", title: "The Coming of the Son of Man", part: "passion", passages: { matthew: "24:29-31", mark: "13:24-27", luke: "21:25-28" } },
  { id: "fig-lesson", title: "The Lesson of the Fig Tree", part: "passion", passages: { matthew: "24:32-35", mark: "13:28-31", luke: "21:29-33" } },
  { id: "unknown-day", title: "The Day and Hour Unknown", part: "passion", passages: { matthew: "24:36-44", mark: "13:32-37", luke: "21:34-36" } },
  { id: "faithful-servant", title: "The Faithful and Unfaithful Servants", part: "passion", passages: { matthew: "24:45-51", luke: "12:35-48" } },
  { id: "ten-virgins", title: "The Ten Virgins", part: "passion", passages: { matthew: "25:1-13" } },
  { id: "sheep-goats", title: "The Sheep and the Goats", part: "passion", passages: { matthew: "25:31-46" } },
  { id: "plot-passover", title: "The Plot to Kill Jesus", part: "passion", passages: { matthew: "26:1-5", mark: "14:1-2", luke: "22:1-2" } },
  { id: "judas-bargain", title: "Judas's Bargain", part: "passion", passages: { matthew: "26:14-16", mark: "14:10-11", luke: "22:3-6" } },
  { id: "passover-prep", title: "Preparing the Passover", part: "passion", passages: { matthew: "26:17-19", mark: "14:12-16", luke: "22:7-13" } },
  { id: "last-supper", title: "The Last Supper", part: "passion", passages: { matthew: "26:20-29", mark: "14:17-25", luke: "22:14-20" }, note: "John does not narrate the bread and the cup here; he gives the footwashing and the farewell discourses instead." },
  { id: "washing-feet", title: "The Washing of the Feet", part: "passion", passages: { john: "13:1-20" } },
  { id: "betrayal-announced", title: "The Betrayal Announced", part: "passion", passages: { matthew: "26:21-25", mark: "14:18-21", luke: "22:21-23", john: "13:21-30" } },
  { id: "greatness-table", title: "Greatness at the Table", part: "passion", passages: { luke: "22:24-30" } },
  { id: "denial-predicted", title: "Peter's Denial Predicted", part: "passion", passages: { matthew: "26:31-35", mark: "14:27-31", luke: "22:31-34", john: "13:36-38" } },
  { id: "new-commandment", title: "A New Commandment", part: "passion", passages: { john: "13:31-35" } },
  { id: "way-truth-life", title: "The Way, the Truth, and the Life", part: "passion", passages: { john: "14:1-14" } },
  { id: "paraclete", title: "The Promise of the Paraclete", part: "passion", passages: { john: "14:15-31" } },
  { id: "vine", title: "The True Vine", part: "passion", passages: { john: "15:1-17" } },
  { id: "hatred", title: "The Hatred of the World", part: "passion", passages: { john: "15:18-16:4" } },
  { id: "spirit-coming", title: "The Coming of the Spirit", part: "passion", passages: { john: "16:5-15" } },
  { id: "grief-joy", title: "Grief Turned to Joy", part: "passion", passages: { john: "16:16-33" } },
  { id: "high-priestly", title: "The High Priestly Prayer", part: "passion", passages: { john: "17:1-26" } },
  { id: "gethsemane", title: "Gethsemane", part: "passion", passages: { matthew: "26:36-46", mark: "14:32-42", luke: "22:39-46" } },
  { id: "arrest", title: "The Arrest", part: "passion", passages: { matthew: "26:47-56", mark: "14:43-52", luke: "22:47-53", john: "18:1-11" } },

  // ---- Trial and Cross -----------------------------------------------------
  { id: "before-caiaphas", title: "Before Annas and Caiaphas", part: "cross", passages: { matthew: "26:57-68", mark: "14:53-65", luke: "22:54", john: "18:12-24" }, note: "John alone records the hearing before Annas; Luke gives the night trial in a single compressed scene." },
  { id: "peters-denial", title: "Peter's Denial", part: "cross", passages: { matthew: "26:69-75", mark: "14:66-72", luke: "22:55-62", john: "18:15-18" }, note: "John spreads the three denials across the courtyard and the charcoal fire; Luke gathers them before the cock crows." },
  { id: "before-pilate", title: "Before Pilate", part: "cross", passages: { matthew: "27:1-2", mark: "15:1-5", luke: "23:1-5", john: "18:28-38" } },
  { id: "judas-death", title: "The Death of Judas", part: "cross", passages: { matthew: "27:3-10" } },
  { id: "before-herod", title: "Before Herod", part: "cross", passages: { luke: "23:6-12" } },
  { id: "barabbas", title: "Barabbas and the Sentence", part: "cross", passages: { matthew: "27:15-26", mark: "15:6-15", luke: "23:13-25", john: "18:38-40" } },
  { id: "scourging", title: "The Scourging and Mockery", part: "cross", passages: { matthew: "27:27-31", mark: "15:16-20", john: "19:1-3" } },
  { id: "ecce-homo", title: "Behold Your King", part: "cross", passages: { matthew: "27:24-26", luke: "23:24-25", john: "19:4-16" } },
  { id: "golgotha", title: "The Road to Golgotha", part: "cross", passages: { matthew: "27:32", mark: "15:21", luke: "23:26", john: "19:17" } },
  { id: "crucifixion", title: "The Crucifixion", part: "cross", passages: { matthew: "27:33-44", mark: "15:22-32", luke: "23:27-43", john: "19:18-27" } },
  { id: "death-jesus", title: "The Death of Jesus", part: "cross", passages: { matthew: "27:45-56", mark: "15:33-41", luke: "23:44-49", john: "19:28-30" } },
  { id: "burial", title: "The Burial", part: "cross", passages: { matthew: "27:57-61", mark: "15:42-47", luke: "23:50-56", john: "19:38-42" } },
  { id: "guard", title: "The Guard at the Tomb", part: "cross", passages: { matthew: "27:62-66" } },

  // ---- Risen and Sent ------------------------------------------------------
  { id: "empty-tomb", title: "The Empty Tomb", part: "risen", passages: { matthew: "28:1-10", mark: "16:1-8", luke: "24:1-12", john: "20:1-10" } },
  { id: "guard-report", title: "The Report of the Guard", part: "risen", passages: { matthew: "28:11-15" } },
  { id: "mary-appearance", title: "Jesus Appears to Mary Magdalene", part: "risen", passages: { mark: "16:9-11", john: "20:11-18" } },
  { id: "emmaus", title: "The Road to Emmaus", part: "risen", passages: { mark: "16:12-13", luke: "24:13-35" } },
  { id: "eleven-appearance", title: "Jesus Appears to the Eleven", part: "risen", passages: { mark: "16:14", luke: "24:36-43", john: "20:19-23" } },
  { id: "thomas", title: "Thomas Believes", part: "risen", passages: { john: "20:24-29" } },
  { id: "sea-appearance", title: "Jesus Appears by the Sea", part: "risen", passages: { john: "21:1-14" } },
  { id: "peter-restored", title: "Peter Restored", part: "risen", passages: { john: "21:15-25" } },
  { id: "commission", title: "The Great Commission", part: "risen", passages: { matthew: "28:16-20", mark: "16:15-18", luke: "24:44-49" } },
  { id: "ascension", title: "The Ascension", part: "risen", passages: { mark: "16:19-20", luke: "24:50-53" } },
];

export function sectionsOf(partId: string): Section[] {
  return SECTIONS.filter((s) => s.part === partId);
}

export function referenceOf(section: Section, gospel: Gospel): string {
  const ref = section.passages[gospel.id];
  return ref ? `${gospel.book} ${ref}` : "";
}

export function shortReferenceOf(section: Section, gospel: Gospel): string {
  const ref = section.passages[gospel.id];
  return ref ? `${gospel.short} ${ref}` : "";
}
