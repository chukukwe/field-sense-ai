// Prepared from the local crop-reco-db seed archive. State/LGA names are MIT-licensed;
// LGA-to-zone assignments are heuristic and every crop calendar row is draft.
export interface FarmGuideData {
  states: Array<{ id: number; name: string }>;
  locations: Array<{ id: number; stateId: number; name: string; zoneId: number; needsReview: boolean }>;
  zones: Array<{ id: number; name: string }>;
  crops: Array<{ id: number; name: string }>;
  calendar: Array<{
    zoneId: number;
    cropId: number;
    seasonLabel: string;
    activity: 'plant' | 'harvest';
    month: number;
    status: 'draft' | 'verified';
    source: string | null;
  }>;
}

export const farmGuideData: FarmGuideData = {
  "states": [
    {
      "id": 1,
      "name": "Abia"
    },
    {
      "id": 2,
      "name": "Adamawa"
    },
    {
      "id": 3,
      "name": "Akwa Ibom"
    },
    {
      "id": 4,
      "name": "Anambra"
    },
    {
      "id": 5,
      "name": "Bauchi"
    },
    {
      "id": 6,
      "name": "Bayelsa"
    },
    {
      "id": 7,
      "name": "Benue"
    },
    {
      "id": 8,
      "name": "Borno"
    },
    {
      "id": 9,
      "name": "Cross River"
    },
    {
      "id": 10,
      "name": "Delta"
    },
    {
      "id": 11,
      "name": "Ebonyi"
    },
    {
      "id": 12,
      "name": "Edo"
    },
    {
      "id": 13,
      "name": "Ekiti"
    },
    {
      "id": 14,
      "name": "Enugu"
    },
    {
      "id": 15,
      "name": "Federal Capital Territory"
    },
    {
      "id": 16,
      "name": "Gombe"
    },
    {
      "id": 17,
      "name": "Imo"
    },
    {
      "id": 18,
      "name": "Jigawa"
    },
    {
      "id": 19,
      "name": "Kaduna"
    },
    {
      "id": 20,
      "name": "Kano"
    },
    {
      "id": 21,
      "name": "Katsina"
    },
    {
      "id": 22,
      "name": "Kebbi"
    },
    {
      "id": 23,
      "name": "Kogi"
    },
    {
      "id": 24,
      "name": "Kwara"
    },
    {
      "id": 25,
      "name": "Lagos"
    },
    {
      "id": 26,
      "name": "Nasarawa"
    },
    {
      "id": 27,
      "name": "Niger"
    },
    {
      "id": 28,
      "name": "Ogun"
    },
    {
      "id": 29,
      "name": "Ondo"
    },
    {
      "id": 30,
      "name": "Osun"
    },
    {
      "id": 31,
      "name": "Oyo"
    },
    {
      "id": 32,
      "name": "Plateau"
    },
    {
      "id": 33,
      "name": "Rivers"
    },
    {
      "id": 34,
      "name": "Sokoto"
    },
    {
      "id": 35,
      "name": "Taraba"
    },
    {
      "id": 36,
      "name": "Yobe"
    },
    {
      "id": 37,
      "name": "Zamfara"
    }
  ],
  "locations": [
    {
      "id": 1,
      "stateId": 1,
      "name": "Aba North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 2,
      "stateId": 1,
      "name": "Aba South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 3,
      "stateId": 1,
      "name": "Arochukwu",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 4,
      "stateId": 1,
      "name": "Bende",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 5,
      "stateId": 1,
      "name": "Ikwuano",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 6,
      "stateId": 1,
      "name": "Isiala Ngwa North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 7,
      "stateId": 1,
      "name": "Isiala Ngwa South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 8,
      "stateId": 1,
      "name": "Isuikwuato",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 9,
      "stateId": 1,
      "name": "Obi Ngwa",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 10,
      "stateId": 1,
      "name": "Ohafia",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 11,
      "stateId": 1,
      "name": "Osisioma",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 12,
      "stateId": 1,
      "name": "Ugwunagbo",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 13,
      "stateId": 1,
      "name": "Ukwa East",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 14,
      "stateId": 1,
      "name": "Ukwa West",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 15,
      "stateId": 1,
      "name": "Umu-Nneochi",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 16,
      "stateId": 1,
      "name": "Umuahia North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 17,
      "stateId": 1,
      "name": "Umuahia South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 18,
      "stateId": 2,
      "name": "Demsa",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 19,
      "stateId": 2,
      "name": "Fufore",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 20,
      "stateId": 2,
      "name": "Ganye",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 21,
      "stateId": 2,
      "name": "Girei",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 22,
      "stateId": 2,
      "name": "Gombi",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 23,
      "stateId": 2,
      "name": "Guyuk",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 24,
      "stateId": 2,
      "name": "Hong",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 25,
      "stateId": 2,
      "name": "Jada",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 26,
      "stateId": 2,
      "name": "Lamurde",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 27,
      "stateId": 2,
      "name": "Madagali",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 28,
      "stateId": 2,
      "name": "Maiha",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 29,
      "stateId": 2,
      "name": "Mayo Belwa",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 30,
      "stateId": 2,
      "name": "Michika",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 31,
      "stateId": 2,
      "name": "Mubi North",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 32,
      "stateId": 2,
      "name": "Mubi South",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 33,
      "stateId": 2,
      "name": "Numan",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 34,
      "stateId": 2,
      "name": "Shelleng",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 35,
      "stateId": 2,
      "name": "Song",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 36,
      "stateId": 2,
      "name": "Toungo",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 37,
      "stateId": 2,
      "name": "Yola North",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 38,
      "stateId": 2,
      "name": "Yola South",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 39,
      "stateId": 3,
      "name": "Abak",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 40,
      "stateId": 3,
      "name": "Eastern Obolo",
      "zoneId": 1,
      "needsReview": false
    },
    {
      "id": 41,
      "stateId": 3,
      "name": "Eket",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 42,
      "stateId": 3,
      "name": "Esit Eket",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 43,
      "stateId": 3,
      "name": "Essien Udim",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 44,
      "stateId": 3,
      "name": "Etim Ekpo",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 45,
      "stateId": 3,
      "name": "Etinan",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 46,
      "stateId": 3,
      "name": "Ibeno",
      "zoneId": 1,
      "needsReview": false
    },
    {
      "id": 47,
      "stateId": 3,
      "name": "Ibesikpo Asutan",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 48,
      "stateId": 3,
      "name": "Ibiono Ibom",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 49,
      "stateId": 3,
      "name": "Ika",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 50,
      "stateId": 3,
      "name": "Ikono",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 51,
      "stateId": 3,
      "name": "Ikot Abasi",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 52,
      "stateId": 3,
      "name": "Ikot Ekpene",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 53,
      "stateId": 3,
      "name": "Ini",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 54,
      "stateId": 3,
      "name": "Itu",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 55,
      "stateId": 3,
      "name": "Mbo",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 56,
      "stateId": 3,
      "name": "Mkpat Enin",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 57,
      "stateId": 3,
      "name": "Nsit Atai",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 58,
      "stateId": 3,
      "name": "Nsit Ibom",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 59,
      "stateId": 3,
      "name": "Nsit Ubium",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 60,
      "stateId": 3,
      "name": "Obot Akara",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 61,
      "stateId": 3,
      "name": "Okobo",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 62,
      "stateId": 3,
      "name": "Onna",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 63,
      "stateId": 3,
      "name": "Oron",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 64,
      "stateId": 3,
      "name": "Oruk Anam",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 65,
      "stateId": 3,
      "name": "Udung Uko",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 66,
      "stateId": 3,
      "name": "Ukanafun",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 67,
      "stateId": 3,
      "name": "Uruan",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 68,
      "stateId": 3,
      "name": "Urue Offong/Oruko",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 69,
      "stateId": 3,
      "name": "Uyo",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 70,
      "stateId": 4,
      "name": "Aguata",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 71,
      "stateId": 4,
      "name": "Anambra East",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 72,
      "stateId": 4,
      "name": "Anambra West",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 73,
      "stateId": 4,
      "name": "Anaocha",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 74,
      "stateId": 4,
      "name": "Awka North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 75,
      "stateId": 4,
      "name": "Awka South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 76,
      "stateId": 4,
      "name": "Ayamelum",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 77,
      "stateId": 4,
      "name": "Dunukofia",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 78,
      "stateId": 4,
      "name": "Ekwusigo",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 79,
      "stateId": 4,
      "name": "Idemili North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 80,
      "stateId": 4,
      "name": "Idemili South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 81,
      "stateId": 4,
      "name": "Ihiala",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 82,
      "stateId": 4,
      "name": "Njikoka",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 83,
      "stateId": 4,
      "name": "Nnewi North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 84,
      "stateId": 4,
      "name": "Nnewi South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 85,
      "stateId": 4,
      "name": "Ogbaru",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 86,
      "stateId": 4,
      "name": "Onitsha North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 87,
      "stateId": 4,
      "name": "Onitsha South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 88,
      "stateId": 4,
      "name": "Orumba North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 89,
      "stateId": 4,
      "name": "Orumba South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 90,
      "stateId": 4,
      "name": "Oyi",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 91,
      "stateId": 5,
      "name": "Alkaleri",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 92,
      "stateId": 5,
      "name": "Bauchi",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 93,
      "stateId": 5,
      "name": "Bogoro",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 94,
      "stateId": 5,
      "name": "Damban",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 95,
      "stateId": 5,
      "name": "Darazo",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 96,
      "stateId": 5,
      "name": "Dass",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 97,
      "stateId": 5,
      "name": "Gamawa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 98,
      "stateId": 5,
      "name": "Ganjuwa",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 99,
      "stateId": 5,
      "name": "Giade",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 100,
      "stateId": 5,
      "name": "Itas/Gadau",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 101,
      "stateId": 5,
      "name": "Jama'are",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 102,
      "stateId": 5,
      "name": "Katagum",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 103,
      "stateId": 5,
      "name": "Kirfi",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 104,
      "stateId": 5,
      "name": "Misau",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 105,
      "stateId": 5,
      "name": "Ningi",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 106,
      "stateId": 5,
      "name": "Shira",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 107,
      "stateId": 5,
      "name": "Tafawa Balewa",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 108,
      "stateId": 5,
      "name": "Toro",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 109,
      "stateId": 5,
      "name": "Warji",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 110,
      "stateId": 5,
      "name": "Zaki",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 111,
      "stateId": 6,
      "name": "Brass",
      "zoneId": 1,
      "needsReview": false
    },
    {
      "id": 112,
      "stateId": 6,
      "name": "Ekeremor",
      "zoneId": 1,
      "needsReview": false
    },
    {
      "id": 113,
      "stateId": 6,
      "name": "Kolokuma/Opokuma",
      "zoneId": 1,
      "needsReview": false
    },
    {
      "id": 114,
      "stateId": 6,
      "name": "Nembe",
      "zoneId": 1,
      "needsReview": false
    },
    {
      "id": 115,
      "stateId": 6,
      "name": "Ogbia",
      "zoneId": 1,
      "needsReview": false
    },
    {
      "id": 116,
      "stateId": 6,
      "name": "Sagbama",
      "zoneId": 1,
      "needsReview": false
    },
    {
      "id": 117,
      "stateId": 6,
      "name": "Southern Ijaw",
      "zoneId": 1,
      "needsReview": false
    },
    {
      "id": 118,
      "stateId": 6,
      "name": "Yenagoa",
      "zoneId": 1,
      "needsReview": false
    },
    {
      "id": 119,
      "stateId": 7,
      "name": "Ado",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 120,
      "stateId": 7,
      "name": "Agatu",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 121,
      "stateId": 7,
      "name": "Apa",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 122,
      "stateId": 7,
      "name": "Buruku",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 123,
      "stateId": 7,
      "name": "Gboko",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 124,
      "stateId": 7,
      "name": "Guma",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 125,
      "stateId": 7,
      "name": "Gwer East",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 126,
      "stateId": 7,
      "name": "Gwer West",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 127,
      "stateId": 7,
      "name": "Katsina Ala",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 128,
      "stateId": 7,
      "name": "Konshisha",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 129,
      "stateId": 7,
      "name": "Kwande",
      "zoneId": 3,
      "needsReview": false
    },
    {
      "id": 130,
      "stateId": 7,
      "name": "Logo",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 131,
      "stateId": 7,
      "name": "Makurdi",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 132,
      "stateId": 7,
      "name": "Obi",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 133,
      "stateId": 7,
      "name": "Ogbadibo",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 134,
      "stateId": 7,
      "name": "Ohimini",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 135,
      "stateId": 7,
      "name": "Oju",
      "zoneId": 3,
      "needsReview": false
    },
    {
      "id": 136,
      "stateId": 7,
      "name": "Okpokwu",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 137,
      "stateId": 7,
      "name": "Otukpo",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 138,
      "stateId": 7,
      "name": "Tarka",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 139,
      "stateId": 7,
      "name": "Ukum",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 140,
      "stateId": 7,
      "name": "Ushongo",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 141,
      "stateId": 7,
      "name": "Vandeikya",
      "zoneId": 3,
      "needsReview": false
    },
    {
      "id": 142,
      "stateId": 8,
      "name": "Abadam",
      "zoneId": 7,
      "needsReview": false
    },
    {
      "id": 143,
      "stateId": 8,
      "name": "Askira/Uba",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 144,
      "stateId": 8,
      "name": "Bama",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 145,
      "stateId": 8,
      "name": "Bayo",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 146,
      "stateId": 8,
      "name": "Biu",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 147,
      "stateId": 8,
      "name": "Chibok",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 148,
      "stateId": 8,
      "name": "Damboa",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 149,
      "stateId": 8,
      "name": "Dikwa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 150,
      "stateId": 8,
      "name": "Gubio",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 151,
      "stateId": 8,
      "name": "Guzamala",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 152,
      "stateId": 8,
      "name": "Gwoza",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 153,
      "stateId": 8,
      "name": "Hawul",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 154,
      "stateId": 8,
      "name": "Jere",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 155,
      "stateId": 8,
      "name": "Kaga",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 156,
      "stateId": 8,
      "name": "Kala/Balge",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 157,
      "stateId": 8,
      "name": "Konduga",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 158,
      "stateId": 8,
      "name": "Kukawa",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 159,
      "stateId": 8,
      "name": "Kwaya Kusar",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 160,
      "stateId": 8,
      "name": "Mafa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 161,
      "stateId": 8,
      "name": "Magumeri",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 162,
      "stateId": 8,
      "name": "Maiduguri",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 163,
      "stateId": 8,
      "name": "Marte",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 164,
      "stateId": 8,
      "name": "Mobbar",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 165,
      "stateId": 8,
      "name": "Monguno",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 166,
      "stateId": 8,
      "name": "Ngala",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 167,
      "stateId": 8,
      "name": "Nganzai",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 168,
      "stateId": 8,
      "name": "Shani",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 169,
      "stateId": 9,
      "name": "Abi",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 170,
      "stateId": 9,
      "name": "Akamkpa",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 171,
      "stateId": 9,
      "name": "Akpabuyo",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 172,
      "stateId": 9,
      "name": "Bakassi",
      "zoneId": 1,
      "needsReview": false
    },
    {
      "id": 173,
      "stateId": 9,
      "name": "Bekwarra",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 174,
      "stateId": 9,
      "name": "Biase",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 175,
      "stateId": 9,
      "name": "Boki",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 176,
      "stateId": 9,
      "name": "Calabar Municipal",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 177,
      "stateId": 9,
      "name": "Calabar South",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 178,
      "stateId": 9,
      "name": "Etung",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 179,
      "stateId": 9,
      "name": "Ikom",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 180,
      "stateId": 9,
      "name": "Obanliku",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 181,
      "stateId": 9,
      "name": "Obubra",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 182,
      "stateId": 9,
      "name": "Obudu",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 183,
      "stateId": 9,
      "name": "Odukpani",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 184,
      "stateId": 9,
      "name": "Ogoja",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 185,
      "stateId": 9,
      "name": "Yakurr",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 186,
      "stateId": 9,
      "name": "Yala",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 187,
      "stateId": 10,
      "name": "Aniocha North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 188,
      "stateId": 10,
      "name": "Aniocha South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 189,
      "stateId": 10,
      "name": "Bomadi",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 190,
      "stateId": 10,
      "name": "Burutu",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 191,
      "stateId": 10,
      "name": "Ethiope East",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 192,
      "stateId": 10,
      "name": "Ethiope West",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 193,
      "stateId": 10,
      "name": "Ika North East",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 194,
      "stateId": 10,
      "name": "Ika South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 195,
      "stateId": 10,
      "name": "Isoko North",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 196,
      "stateId": 10,
      "name": "Isoko South",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 197,
      "stateId": 10,
      "name": "Ndokwa East",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 198,
      "stateId": 10,
      "name": "Ndokwa West",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 199,
      "stateId": 10,
      "name": "Okpe",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 200,
      "stateId": 10,
      "name": "Oshimili North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 201,
      "stateId": 10,
      "name": "Oshimili South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 202,
      "stateId": 10,
      "name": "Patani",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 203,
      "stateId": 10,
      "name": "Sapele",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 204,
      "stateId": 10,
      "name": "Udu",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 205,
      "stateId": 10,
      "name": "Ughelli North",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 206,
      "stateId": 10,
      "name": "Ughelli South",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 207,
      "stateId": 10,
      "name": "Ukwuani",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 208,
      "stateId": 10,
      "name": "Uvwie",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 209,
      "stateId": 10,
      "name": "Warri North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 210,
      "stateId": 10,
      "name": "Warri South",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 211,
      "stateId": 10,
      "name": "Warri South West",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 212,
      "stateId": 11,
      "name": "Abakaliki",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 213,
      "stateId": 11,
      "name": "Afikpo North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 214,
      "stateId": 11,
      "name": "Afikpo South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 215,
      "stateId": 11,
      "name": "Ebonyi",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 216,
      "stateId": 11,
      "name": "Ezza North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 217,
      "stateId": 11,
      "name": "Ezza South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 218,
      "stateId": 11,
      "name": "Ikwo",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 219,
      "stateId": 11,
      "name": "Ishielu",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 220,
      "stateId": 11,
      "name": "Ivo",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 221,
      "stateId": 11,
      "name": "Izzi",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 222,
      "stateId": 11,
      "name": "Ohaozara",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 223,
      "stateId": 11,
      "name": "Ohaukwu",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 224,
      "stateId": 11,
      "name": "Onicha",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 225,
      "stateId": 12,
      "name": "Akoko Edo",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 226,
      "stateId": 12,
      "name": "Egor",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 227,
      "stateId": 12,
      "name": "Esan Central",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 228,
      "stateId": 12,
      "name": "Esan North East",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 229,
      "stateId": 12,
      "name": "Esan South East",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 230,
      "stateId": 12,
      "name": "Esan West",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 231,
      "stateId": 12,
      "name": "Etsako Central",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 232,
      "stateId": 12,
      "name": "Etsako East",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 233,
      "stateId": 12,
      "name": "Etsako West",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 234,
      "stateId": 12,
      "name": "Igueben",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 235,
      "stateId": 12,
      "name": "Ikpoba Okha",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 236,
      "stateId": 12,
      "name": "Oredo",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 237,
      "stateId": 12,
      "name": "Orhionmwon",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 238,
      "stateId": 12,
      "name": "Ovia North East",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 239,
      "stateId": 12,
      "name": "Ovia South West",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 240,
      "stateId": 12,
      "name": "Owan East",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 241,
      "stateId": 12,
      "name": "Owan West",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 242,
      "stateId": 12,
      "name": "Uhunmwonde",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 243,
      "stateId": 13,
      "name": "Ado-Ekiti",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 244,
      "stateId": 13,
      "name": "Efon",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 245,
      "stateId": 13,
      "name": "Ekiti East",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 246,
      "stateId": 13,
      "name": "Ekiti South West",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 247,
      "stateId": 13,
      "name": "Ekiti West",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 248,
      "stateId": 13,
      "name": "Emure",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 249,
      "stateId": 13,
      "name": "Gbonyin",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 250,
      "stateId": 13,
      "name": "Ido-Osi",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 251,
      "stateId": 13,
      "name": "Ijero",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 252,
      "stateId": 13,
      "name": "Ikere",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 253,
      "stateId": 13,
      "name": "Ikole",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 254,
      "stateId": 13,
      "name": "Ilejemeje",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 255,
      "stateId": 13,
      "name": "Irepodun/Ifelodun",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 256,
      "stateId": 13,
      "name": "Ise/Orun",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 257,
      "stateId": 13,
      "name": "Moba",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 258,
      "stateId": 13,
      "name": "Oye",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 259,
      "stateId": 14,
      "name": "Aninri",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 260,
      "stateId": 14,
      "name": "Awgu",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 261,
      "stateId": 14,
      "name": "Enugu East",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 262,
      "stateId": 14,
      "name": "Enugu North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 263,
      "stateId": 14,
      "name": "Enugu South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 264,
      "stateId": 14,
      "name": "Ezeagu",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 265,
      "stateId": 14,
      "name": "Igbo Etiti",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 266,
      "stateId": 14,
      "name": "Igbo Eze North",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 267,
      "stateId": 14,
      "name": "Igbo Eze South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 268,
      "stateId": 14,
      "name": "Isi-Uzo",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 269,
      "stateId": 14,
      "name": "Nkanu East",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 270,
      "stateId": 14,
      "name": "Nkanu West",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 271,
      "stateId": 14,
      "name": "Nsukka",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 272,
      "stateId": 14,
      "name": "Oji-River",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 273,
      "stateId": 14,
      "name": "Udenu",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 274,
      "stateId": 14,
      "name": "Udi",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 275,
      "stateId": 14,
      "name": "Uzo-Uwani",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 276,
      "stateId": 15,
      "name": "Abaji",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 277,
      "stateId": 15,
      "name": "Abuja",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 278,
      "stateId": 15,
      "name": "Bwari",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 279,
      "stateId": 15,
      "name": "Gwagwalada",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 280,
      "stateId": 15,
      "name": "Kuje",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 281,
      "stateId": 15,
      "name": "Kwali",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 282,
      "stateId": 16,
      "name": "Akko",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 283,
      "stateId": 16,
      "name": "Balanga",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 284,
      "stateId": 16,
      "name": "Billiri",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 285,
      "stateId": 16,
      "name": "Dukku",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 286,
      "stateId": 16,
      "name": "Funakaye",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 287,
      "stateId": 16,
      "name": "Gombe",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 288,
      "stateId": 16,
      "name": "Kaltungo",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 289,
      "stateId": 16,
      "name": "Kwami",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 290,
      "stateId": 16,
      "name": "Nafada",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 291,
      "stateId": 16,
      "name": "Shongom",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 292,
      "stateId": 16,
      "name": "Yamaltu/Deba",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 293,
      "stateId": 17,
      "name": "Aboh Mbaise",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 294,
      "stateId": 17,
      "name": "Ahiazu Mbaise",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 295,
      "stateId": 17,
      "name": "Ehime Mbano",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 296,
      "stateId": 17,
      "name": "Ezinihitte Mbaise",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 297,
      "stateId": 17,
      "name": "Ideato North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 298,
      "stateId": 17,
      "name": "Ideato South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 299,
      "stateId": 17,
      "name": "Ihitte/Uboma",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 300,
      "stateId": 17,
      "name": "Ikeduru",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 301,
      "stateId": 17,
      "name": "Isiala Mbano",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 302,
      "stateId": 17,
      "name": "Isu",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 303,
      "stateId": 17,
      "name": "Mbaitoli",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 304,
      "stateId": 17,
      "name": "Ngor Okpala",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 305,
      "stateId": 17,
      "name": "Njaba",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 306,
      "stateId": 17,
      "name": "Nkwerre",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 307,
      "stateId": 17,
      "name": "Nwangele",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 308,
      "stateId": 17,
      "name": "Obowo",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 309,
      "stateId": 17,
      "name": "Oguta",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 310,
      "stateId": 17,
      "name": "Ohaji/Egbema",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 311,
      "stateId": 17,
      "name": "Okigwe",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 312,
      "stateId": 17,
      "name": "Onuimo",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 313,
      "stateId": 17,
      "name": "Orlu",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 314,
      "stateId": 17,
      "name": "Orsu",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 315,
      "stateId": 17,
      "name": "Oru East",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 316,
      "stateId": 17,
      "name": "Oru West",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 317,
      "stateId": 17,
      "name": "Owerri Municipal",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 318,
      "stateId": 17,
      "name": "Owerri North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 319,
      "stateId": 17,
      "name": "Owerri West",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 320,
      "stateId": 18,
      "name": "Auyo",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 321,
      "stateId": 18,
      "name": "Babura",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 322,
      "stateId": 18,
      "name": "Biriniwa",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 323,
      "stateId": 18,
      "name": "Birnin Kudu",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 324,
      "stateId": 18,
      "name": "Buji",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 325,
      "stateId": 18,
      "name": "Dutse",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 326,
      "stateId": 18,
      "name": "Gagarawa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 327,
      "stateId": 18,
      "name": "Garki",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 328,
      "stateId": 18,
      "name": "Gumel",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 329,
      "stateId": 18,
      "name": "Guri",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 330,
      "stateId": 18,
      "name": "Gwaram",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 331,
      "stateId": 18,
      "name": "Gwiwa",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 332,
      "stateId": 18,
      "name": "Hadejia",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 333,
      "stateId": 18,
      "name": "Jahun",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 334,
      "stateId": 18,
      "name": "Kafin Hausa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 335,
      "stateId": 18,
      "name": "Kaugama",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 336,
      "stateId": 18,
      "name": "Kazaure",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 337,
      "stateId": 18,
      "name": "Kiri Kasama",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 338,
      "stateId": 18,
      "name": "Kiyawa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 339,
      "stateId": 18,
      "name": "Maigatari",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 340,
      "stateId": 18,
      "name": "Malam Madori",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 341,
      "stateId": 18,
      "name": "Miga",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 342,
      "stateId": 18,
      "name": "Ringim",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 343,
      "stateId": 18,
      "name": "Roni",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 344,
      "stateId": 18,
      "name": "Sule Tankarkar",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 345,
      "stateId": 18,
      "name": "Taura",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 346,
      "stateId": 18,
      "name": "Yankwashi",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 347,
      "stateId": 19,
      "name": "Birnin Gwari",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 348,
      "stateId": 19,
      "name": "Chikun",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 349,
      "stateId": 19,
      "name": "Giwa",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 350,
      "stateId": 19,
      "name": "Igabi",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 351,
      "stateId": 19,
      "name": "Ikara",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 352,
      "stateId": 19,
      "name": "Jaba",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 353,
      "stateId": 19,
      "name": "Jema'a",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 354,
      "stateId": 19,
      "name": "Kachia",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 355,
      "stateId": 19,
      "name": "Kaduna North",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 356,
      "stateId": 19,
      "name": "Kaduna South",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 357,
      "stateId": 19,
      "name": "Kagarko",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 358,
      "stateId": 19,
      "name": "Kajuru",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 359,
      "stateId": 19,
      "name": "Kaura",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 360,
      "stateId": 19,
      "name": "Kauru",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 361,
      "stateId": 19,
      "name": "Kubau",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 362,
      "stateId": 19,
      "name": "Kudan",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 363,
      "stateId": 19,
      "name": "Lere",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 364,
      "stateId": 19,
      "name": "Makarfi",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 365,
      "stateId": 19,
      "name": "Sabon Gari",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 366,
      "stateId": 19,
      "name": "Sanga",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 367,
      "stateId": 19,
      "name": "Soba",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 368,
      "stateId": 19,
      "name": "Zangon Kataf",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 369,
      "stateId": 19,
      "name": "Zaria",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 370,
      "stateId": 20,
      "name": "Ajingi",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 371,
      "stateId": 20,
      "name": "Albasu",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 372,
      "stateId": 20,
      "name": "Bagwai",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 373,
      "stateId": 20,
      "name": "Bebeji",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 374,
      "stateId": 20,
      "name": "Bichi",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 375,
      "stateId": 20,
      "name": "Bunkure",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 376,
      "stateId": 20,
      "name": "Dala",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 377,
      "stateId": 20,
      "name": "Dambatta",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 378,
      "stateId": 20,
      "name": "Dawakin Kudu",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 379,
      "stateId": 20,
      "name": "Dawakin Tofa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 380,
      "stateId": 20,
      "name": "Doguwa",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 381,
      "stateId": 20,
      "name": "Fagge",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 382,
      "stateId": 20,
      "name": "Gabasawa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 383,
      "stateId": 20,
      "name": "Garko",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 384,
      "stateId": 20,
      "name": "Garun Malam",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 385,
      "stateId": 20,
      "name": "Gaya",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 386,
      "stateId": 20,
      "name": "Gezawa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 387,
      "stateId": 20,
      "name": "Gwale",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 388,
      "stateId": 20,
      "name": "Gwarzo",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 389,
      "stateId": 20,
      "name": "Kabo",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 390,
      "stateId": 20,
      "name": "Kano Municipal",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 391,
      "stateId": 20,
      "name": "Karaye",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 392,
      "stateId": 20,
      "name": "Kibiya",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 393,
      "stateId": 20,
      "name": "Kiru",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 394,
      "stateId": 20,
      "name": "Kunchi",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 395,
      "stateId": 20,
      "name": "Kura",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 396,
      "stateId": 20,
      "name": "Madobi",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 397,
      "stateId": 20,
      "name": "Makoda",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 398,
      "stateId": 20,
      "name": "Minjibir",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 399,
      "stateId": 20,
      "name": "Nasarawa",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 400,
      "stateId": 20,
      "name": "Rano",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 401,
      "stateId": 20,
      "name": "Rimin Gado",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 402,
      "stateId": 20,
      "name": "Rogo",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 403,
      "stateId": 20,
      "name": "Shanono",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 404,
      "stateId": 20,
      "name": "Sumaila",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 405,
      "stateId": 20,
      "name": "Takai",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 406,
      "stateId": 20,
      "name": "Tarauni",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 407,
      "stateId": 20,
      "name": "Tofa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 408,
      "stateId": 20,
      "name": "Tsanyawa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 409,
      "stateId": 20,
      "name": "Tudun Wada",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 410,
      "stateId": 20,
      "name": "Ungogo",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 411,
      "stateId": 20,
      "name": "Warawa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 412,
      "stateId": 20,
      "name": "Wudil",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 413,
      "stateId": 20,
      "name": "kumbotso",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 414,
      "stateId": 21,
      "name": "Bakori",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 415,
      "stateId": 21,
      "name": "Batagarawa",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 416,
      "stateId": 21,
      "name": "Batsari",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 417,
      "stateId": 21,
      "name": "Baure",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 418,
      "stateId": 21,
      "name": "Bindawa",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 419,
      "stateId": 21,
      "name": "Charanchi",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 420,
      "stateId": 21,
      "name": "Dan Musa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 421,
      "stateId": 21,
      "name": "DanDume",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 422,
      "stateId": 21,
      "name": "Danja",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 423,
      "stateId": 21,
      "name": "Daura",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 424,
      "stateId": 21,
      "name": "Dutsi",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 425,
      "stateId": 21,
      "name": "Dutsin-Ma",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 426,
      "stateId": 21,
      "name": "Faskari",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 427,
      "stateId": 21,
      "name": "Funtua",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 428,
      "stateId": 21,
      "name": "Ingawa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 429,
      "stateId": 21,
      "name": "Jibia",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 430,
      "stateId": 21,
      "name": "Kafur",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 431,
      "stateId": 21,
      "name": "Kaita",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 432,
      "stateId": 21,
      "name": "Kankara",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 433,
      "stateId": 21,
      "name": "Kankia",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 434,
      "stateId": 21,
      "name": "Katsina",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 435,
      "stateId": 21,
      "name": "Kurfi",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 436,
      "stateId": 21,
      "name": "Kusada",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 437,
      "stateId": 21,
      "name": "Mai'Adua",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 438,
      "stateId": 21,
      "name": "Malumfashi",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 439,
      "stateId": 21,
      "name": "Mani",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 440,
      "stateId": 21,
      "name": "Mashi",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 441,
      "stateId": 21,
      "name": "Matazu",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 442,
      "stateId": 21,
      "name": "Musawa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 443,
      "stateId": 21,
      "name": "Rimi",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 444,
      "stateId": 21,
      "name": "Sabuwa",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 445,
      "stateId": 21,
      "name": "Safana",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 446,
      "stateId": 21,
      "name": "Sandamu",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 447,
      "stateId": 21,
      "name": "Zango",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 448,
      "stateId": 22,
      "name": "Aliero",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 449,
      "stateId": 22,
      "name": "Arewa Dandi",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 450,
      "stateId": 22,
      "name": "Argungu",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 451,
      "stateId": 22,
      "name": "Augie",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 452,
      "stateId": 22,
      "name": "Bagudo",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 453,
      "stateId": 22,
      "name": "Birnin Kebbi",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 454,
      "stateId": 22,
      "name": "Bunza",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 455,
      "stateId": 22,
      "name": "Dandi",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 456,
      "stateId": 22,
      "name": "Danko-Wasagu",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 457,
      "stateId": 22,
      "name": "Fakai",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 458,
      "stateId": 22,
      "name": "Gwandu",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 459,
      "stateId": 22,
      "name": "Jega",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 460,
      "stateId": 22,
      "name": "Kalgo",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 461,
      "stateId": 22,
      "name": "Koko/Besse",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 462,
      "stateId": 22,
      "name": "Maiyama",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 463,
      "stateId": 22,
      "name": "Ngaski",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 464,
      "stateId": 22,
      "name": "Sakaba",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 465,
      "stateId": 22,
      "name": "Shanga",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 466,
      "stateId": 22,
      "name": "Suru",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 467,
      "stateId": 22,
      "name": "Yauri",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 468,
      "stateId": 22,
      "name": "Zuru",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 469,
      "stateId": 23,
      "name": "Adavi",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 470,
      "stateId": 23,
      "name": "Ajaokuta",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 471,
      "stateId": 23,
      "name": "Ankpa",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 472,
      "stateId": 23,
      "name": "Bassa",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 473,
      "stateId": 23,
      "name": "Dekina",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 474,
      "stateId": 23,
      "name": "Ibaji",
      "zoneId": 3,
      "needsReview": false
    },
    {
      "id": 475,
      "stateId": 23,
      "name": "Idah",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 476,
      "stateId": 23,
      "name": "Igalamela Odolu",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 477,
      "stateId": 23,
      "name": "Ijumu",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 478,
      "stateId": 23,
      "name": "Kabba/Bunu",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 479,
      "stateId": 23,
      "name": "Kogi",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 480,
      "stateId": 23,
      "name": "Lokoja",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 481,
      "stateId": 23,
      "name": "Mopa-Muro",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 482,
      "stateId": 23,
      "name": "Ofu",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 483,
      "stateId": 23,
      "name": "Ogori/Magongo",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 484,
      "stateId": 23,
      "name": "Okehi",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 485,
      "stateId": 23,
      "name": "Okene",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 486,
      "stateId": 23,
      "name": "Olamaboro",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 487,
      "stateId": 23,
      "name": "Omala",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 488,
      "stateId": 23,
      "name": "Yagba East",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 489,
      "stateId": 23,
      "name": "Yagba West",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 490,
      "stateId": 24,
      "name": "Asa",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 491,
      "stateId": 24,
      "name": "Baruten",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 492,
      "stateId": 24,
      "name": "Edu",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 493,
      "stateId": 24,
      "name": "Ekiti",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 494,
      "stateId": 24,
      "name": "Ifelodun",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 495,
      "stateId": 24,
      "name": "Ilorin East",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 496,
      "stateId": 24,
      "name": "Ilorin South",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 497,
      "stateId": 24,
      "name": "Ilorin West",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 498,
      "stateId": 24,
      "name": "Irepodun",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 499,
      "stateId": 24,
      "name": "Isin",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 500,
      "stateId": 24,
      "name": "Kaiama",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 501,
      "stateId": 24,
      "name": "Moro",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 502,
      "stateId": 24,
      "name": "Offa",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 503,
      "stateId": 24,
      "name": "Oke-Ero",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 504,
      "stateId": 24,
      "name": "Oyun",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 505,
      "stateId": 24,
      "name": "Pategi",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 506,
      "stateId": 25,
      "name": "Agege",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 507,
      "stateId": 25,
      "name": "Ajeromi-Ifelodun",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 508,
      "stateId": 25,
      "name": "Alimosho",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 509,
      "stateId": 25,
      "name": "Amuwo-Odofin",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 510,
      "stateId": 25,
      "name": "Apapa",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 511,
      "stateId": 25,
      "name": "Badagry",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 512,
      "stateId": 25,
      "name": "Epe",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 513,
      "stateId": 25,
      "name": "Eti-Osa",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 514,
      "stateId": 25,
      "name": "Ibeju-Lekki",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 515,
      "stateId": 25,
      "name": "Ifako-Ijaiye",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 516,
      "stateId": 25,
      "name": "Ikeja",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 517,
      "stateId": 25,
      "name": "Ikorodu",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 518,
      "stateId": 25,
      "name": "Kosofe",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 519,
      "stateId": 25,
      "name": "Lagos Island",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 520,
      "stateId": 25,
      "name": "Lagos Mainland",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 521,
      "stateId": 25,
      "name": "Mushin",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 522,
      "stateId": 25,
      "name": "Ojo",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 523,
      "stateId": 25,
      "name": "Oshodi-Isolo",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 524,
      "stateId": 25,
      "name": "Somolu",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 525,
      "stateId": 25,
      "name": "Surulere",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 526,
      "stateId": 26,
      "name": "Akwanga",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 527,
      "stateId": 26,
      "name": "Awe",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 528,
      "stateId": 26,
      "name": "Doma",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 529,
      "stateId": 26,
      "name": "Karu",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 530,
      "stateId": 26,
      "name": "Keana",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 531,
      "stateId": 26,
      "name": "Keffi",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 532,
      "stateId": 26,
      "name": "Kokona",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 533,
      "stateId": 26,
      "name": "Lafia",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 534,
      "stateId": 26,
      "name": "Nasarawa",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 535,
      "stateId": 26,
      "name": "Nasarawa Egon",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 536,
      "stateId": 26,
      "name": "Obi",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 537,
      "stateId": 26,
      "name": "Toto",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 538,
      "stateId": 26,
      "name": "Wamba",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 539,
      "stateId": 27,
      "name": "Agaie",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 540,
      "stateId": 27,
      "name": "Agwara",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 541,
      "stateId": 27,
      "name": "Bida",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 542,
      "stateId": 27,
      "name": "Borgu",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 543,
      "stateId": 27,
      "name": "Bosso",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 544,
      "stateId": 27,
      "name": "Chanchaga",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 545,
      "stateId": 27,
      "name": "Edati",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 546,
      "stateId": 27,
      "name": "Gbako",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 547,
      "stateId": 27,
      "name": "Gurara",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 548,
      "stateId": 27,
      "name": "Katcha",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 549,
      "stateId": 27,
      "name": "Kontagora",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 550,
      "stateId": 27,
      "name": "Lapai",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 551,
      "stateId": 27,
      "name": "Lavun",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 552,
      "stateId": 27,
      "name": "Magama",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 553,
      "stateId": 27,
      "name": "Mariga",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 554,
      "stateId": 27,
      "name": "Mashegu",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 555,
      "stateId": 27,
      "name": "Mokwa",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 556,
      "stateId": 27,
      "name": "Munya",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 557,
      "stateId": 27,
      "name": "Paikoro",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 558,
      "stateId": 27,
      "name": "Rafi",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 559,
      "stateId": 27,
      "name": "Rijau",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 560,
      "stateId": 27,
      "name": "Shiroro",
      "zoneId": 5,
      "needsReview": false
    },
    {
      "id": 561,
      "stateId": 27,
      "name": "Suleja",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 562,
      "stateId": 27,
      "name": "Tafa",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 563,
      "stateId": 27,
      "name": "Wushishi",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 564,
      "stateId": 28,
      "name": "Abeokuta North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 565,
      "stateId": 28,
      "name": "Abeokuta South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 566,
      "stateId": 28,
      "name": "Ado-Odo/Ota",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 567,
      "stateId": 28,
      "name": "Ewekoro",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 568,
      "stateId": 28,
      "name": "Ifo",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 569,
      "stateId": 28,
      "name": "Ijebu East",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 570,
      "stateId": 28,
      "name": "Ijebu North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 571,
      "stateId": 28,
      "name": "Ijebu North East",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 572,
      "stateId": 28,
      "name": "Ijebu Ode",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 573,
      "stateId": 28,
      "name": "Ikenne",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 574,
      "stateId": 28,
      "name": "Imeko Afon",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 575,
      "stateId": 28,
      "name": "Ipokia",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 576,
      "stateId": 28,
      "name": "Obafemi Owode",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 577,
      "stateId": 28,
      "name": "Odeda",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 578,
      "stateId": 28,
      "name": "Odogbolu",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 579,
      "stateId": 28,
      "name": "Ogun Waterside",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 580,
      "stateId": 28,
      "name": "Remo North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 581,
      "stateId": 28,
      "name": "Shagamu",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 582,
      "stateId": 28,
      "name": "Yewa North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 583,
      "stateId": 28,
      "name": "Yewa South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 584,
      "stateId": 29,
      "name": "Akoko North East",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 585,
      "stateId": 29,
      "name": "Akoko North West",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 586,
      "stateId": 29,
      "name": "Akoko South East",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 587,
      "stateId": 29,
      "name": "Akoko South West",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 588,
      "stateId": 29,
      "name": "Akure North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 589,
      "stateId": 29,
      "name": "Akure South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 590,
      "stateId": 29,
      "name": "Ese Odo",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 591,
      "stateId": 29,
      "name": "Idanre",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 592,
      "stateId": 29,
      "name": "Ifedore",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 593,
      "stateId": 29,
      "name": "Ilaje",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 594,
      "stateId": 29,
      "name": "Ile Oluji/Okeigbo",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 595,
      "stateId": 29,
      "name": "Irele",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 596,
      "stateId": 29,
      "name": "Odigbo",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 597,
      "stateId": 29,
      "name": "Okitipupa",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 598,
      "stateId": 29,
      "name": "Ondo East",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 599,
      "stateId": 29,
      "name": "Ondo West",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 600,
      "stateId": 29,
      "name": "Ose",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 601,
      "stateId": 29,
      "name": "Owo",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 602,
      "stateId": 30,
      "name": "Aiyedire",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 603,
      "stateId": 30,
      "name": "Atakunmosa East",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 604,
      "stateId": 30,
      "name": "Atakunmosa West",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 605,
      "stateId": 30,
      "name": "Ayedaade",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 606,
      "stateId": 30,
      "name": "Boluwaduro",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 607,
      "stateId": 30,
      "name": "Boripe",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 608,
      "stateId": 30,
      "name": "Ede North",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 609,
      "stateId": 30,
      "name": "Ede South",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 610,
      "stateId": 30,
      "name": "Egbedore",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 611,
      "stateId": 30,
      "name": "Ejigbo",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 612,
      "stateId": 30,
      "name": "Ife Central",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 613,
      "stateId": 30,
      "name": "Ife East",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 614,
      "stateId": 30,
      "name": "Ife North",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 615,
      "stateId": 30,
      "name": "Ife South",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 616,
      "stateId": 30,
      "name": "Ifedayo",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 617,
      "stateId": 30,
      "name": "Ifelodun",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 618,
      "stateId": 30,
      "name": "Ila",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 619,
      "stateId": 30,
      "name": "Ilesa East",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 620,
      "stateId": 30,
      "name": "Ilesa West",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 621,
      "stateId": 30,
      "name": "Irepodun",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 622,
      "stateId": 30,
      "name": "Irewole",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 623,
      "stateId": 30,
      "name": "Isokan",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 624,
      "stateId": 30,
      "name": "Iwo",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 625,
      "stateId": 30,
      "name": "Obokun",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 626,
      "stateId": 30,
      "name": "Odo-Otin",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 627,
      "stateId": 30,
      "name": "Ola-Oluwa",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 628,
      "stateId": 30,
      "name": "Olorunda",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 629,
      "stateId": 30,
      "name": "Oriade",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 630,
      "stateId": 30,
      "name": "Orolu",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 631,
      "stateId": 30,
      "name": "Osogbo",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 632,
      "stateId": 31,
      "name": "Afijio",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 633,
      "stateId": 31,
      "name": "Akinyele",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 634,
      "stateId": 31,
      "name": "Atiba",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 635,
      "stateId": 31,
      "name": "Atisbo",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 636,
      "stateId": 31,
      "name": "Egbeda",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 637,
      "stateId": 31,
      "name": "Ibadan North",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 638,
      "stateId": 31,
      "name": "Ibadan North East",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 639,
      "stateId": 31,
      "name": "Ibadan North West",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 640,
      "stateId": 31,
      "name": "Ibadan South East",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 641,
      "stateId": 31,
      "name": "Ibadan South West",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 642,
      "stateId": 31,
      "name": "Ibarapa Central",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 643,
      "stateId": 31,
      "name": "Ibarapa East",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 644,
      "stateId": 31,
      "name": "Ibarapa North",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 645,
      "stateId": 31,
      "name": "Ido",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 646,
      "stateId": 31,
      "name": "Irepo",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 647,
      "stateId": 31,
      "name": "Iseyin",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 648,
      "stateId": 31,
      "name": "Itesiwaju",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 649,
      "stateId": 31,
      "name": "Iwajowa",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 650,
      "stateId": 31,
      "name": "Kajola",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 651,
      "stateId": 31,
      "name": "Lagelu",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 652,
      "stateId": 31,
      "name": "Ogbomosho North",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 653,
      "stateId": 31,
      "name": "Ogbomosho South",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 654,
      "stateId": 31,
      "name": "Ogo Oluwa",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 655,
      "stateId": 31,
      "name": "Olorunsogo",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 656,
      "stateId": 31,
      "name": "Oluyole",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 657,
      "stateId": 31,
      "name": "Ona Ara",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 658,
      "stateId": 31,
      "name": "Oorelope",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 659,
      "stateId": 31,
      "name": "Ori Ire",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 660,
      "stateId": 31,
      "name": "Oyo East",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 661,
      "stateId": 31,
      "name": "Oyo West",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 662,
      "stateId": 31,
      "name": "Saki East",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 663,
      "stateId": 31,
      "name": "Saki West",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 664,
      "stateId": 31,
      "name": "Surulere",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 665,
      "stateId": 32,
      "name": "Barkin Ladi",
      "zoneId": 8,
      "needsReview": true
    },
    {
      "id": 666,
      "stateId": 32,
      "name": "Bassa",
      "zoneId": 8,
      "needsReview": true
    },
    {
      "id": 667,
      "stateId": 32,
      "name": "Bokkos",
      "zoneId": 8,
      "needsReview": true
    },
    {
      "id": 668,
      "stateId": 32,
      "name": "Jos East",
      "zoneId": 8,
      "needsReview": true
    },
    {
      "id": 669,
      "stateId": 32,
      "name": "Jos North",
      "zoneId": 8,
      "needsReview": true
    },
    {
      "id": 670,
      "stateId": 32,
      "name": "Jos South",
      "zoneId": 8,
      "needsReview": true
    },
    {
      "id": 671,
      "stateId": 32,
      "name": "Kanam",
      "zoneId": 8,
      "needsReview": true
    },
    {
      "id": 672,
      "stateId": 32,
      "name": "Kanke",
      "zoneId": 8,
      "needsReview": true
    },
    {
      "id": 673,
      "stateId": 32,
      "name": "Langtang North",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 674,
      "stateId": 32,
      "name": "Langtang South",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 675,
      "stateId": 32,
      "name": "Mangu",
      "zoneId": 8,
      "needsReview": true
    },
    {
      "id": 676,
      "stateId": 32,
      "name": "Mikang",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 677,
      "stateId": 32,
      "name": "Pankshin",
      "zoneId": 8,
      "needsReview": true
    },
    {
      "id": 678,
      "stateId": 32,
      "name": "Qua'an Pan",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 679,
      "stateId": 32,
      "name": "Riyom",
      "zoneId": 8,
      "needsReview": true
    },
    {
      "id": 680,
      "stateId": 32,
      "name": "Shendam",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 681,
      "stateId": 32,
      "name": "Wase",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 682,
      "stateId": 33,
      "name": "Abua-Odual",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 683,
      "stateId": 33,
      "name": "Ahoada East",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 684,
      "stateId": 33,
      "name": "Ahoada West",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 685,
      "stateId": 33,
      "name": "Akuku-Toru",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 686,
      "stateId": 33,
      "name": "Andoni",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 687,
      "stateId": 33,
      "name": "Asari-Toru",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 688,
      "stateId": 33,
      "name": "Bonny",
      "zoneId": 1,
      "needsReview": false
    },
    {
      "id": 689,
      "stateId": 33,
      "name": "Degema",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 690,
      "stateId": 33,
      "name": "Eleme",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 691,
      "stateId": 33,
      "name": "Emohua",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 692,
      "stateId": 33,
      "name": "Etche",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 693,
      "stateId": 33,
      "name": "Gokana",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 694,
      "stateId": 33,
      "name": "Ikwerre",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 695,
      "stateId": 33,
      "name": "Khana",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 696,
      "stateId": 33,
      "name": "Obio/Akpor",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 697,
      "stateId": 33,
      "name": "Ogba/Egbema/Ndoni",
      "zoneId": 2,
      "needsReview": false
    },
    {
      "id": 698,
      "stateId": 33,
      "name": "Ogu/Bolo",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 699,
      "stateId": 33,
      "name": "Okrika",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 700,
      "stateId": 33,
      "name": "Omuma",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 701,
      "stateId": 33,
      "name": "Opobo/Nkoro",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 702,
      "stateId": 33,
      "name": "Oyigbo",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 703,
      "stateId": 33,
      "name": "Port Harcourt",
      "zoneId": 2,
      "needsReview": true
    },
    {
      "id": 704,
      "stateId": 33,
      "name": "Tai",
      "zoneId": 1,
      "needsReview": true
    },
    {
      "id": 705,
      "stateId": 34,
      "name": "Binji",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 706,
      "stateId": 34,
      "name": "Bodinga",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 707,
      "stateId": 34,
      "name": "Dange/Shuni",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 708,
      "stateId": 34,
      "name": "Gada",
      "zoneId": 7,
      "needsReview": false
    },
    {
      "id": 709,
      "stateId": 34,
      "name": "Goronyo",
      "zoneId": 7,
      "needsReview": false
    },
    {
      "id": 710,
      "stateId": 34,
      "name": "Gudu",
      "zoneId": 7,
      "needsReview": false
    },
    {
      "id": 711,
      "stateId": 34,
      "name": "Gwadabawa",
      "zoneId": 7,
      "needsReview": false
    },
    {
      "id": 712,
      "stateId": 34,
      "name": "Illela",
      "zoneId": 7,
      "needsReview": false
    },
    {
      "id": 713,
      "stateId": 34,
      "name": "Isa",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 714,
      "stateId": 34,
      "name": "Kebbe",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 715,
      "stateId": 34,
      "name": "Kware",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 716,
      "stateId": 34,
      "name": "Rabah",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 717,
      "stateId": 34,
      "name": "Sabon Birni",
      "zoneId": 7,
      "needsReview": false
    },
    {
      "id": 718,
      "stateId": 34,
      "name": "Shagari",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 719,
      "stateId": 34,
      "name": "Silame",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 720,
      "stateId": 34,
      "name": "Sokoto North",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 721,
      "stateId": 34,
      "name": "Sokoto South",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 722,
      "stateId": 34,
      "name": "Tambuwal",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 723,
      "stateId": 34,
      "name": "Tangaza",
      "zoneId": 7,
      "needsReview": false
    },
    {
      "id": 724,
      "stateId": 34,
      "name": "Tureta",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 725,
      "stateId": 34,
      "name": "Wamako",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 726,
      "stateId": 34,
      "name": "Wurno",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 727,
      "stateId": 34,
      "name": "Yabo",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 728,
      "stateId": 35,
      "name": "Ardo Kola",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 729,
      "stateId": 35,
      "name": "Bali",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 730,
      "stateId": 35,
      "name": "Donga",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 731,
      "stateId": 35,
      "name": "Gashaka",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 732,
      "stateId": 35,
      "name": "Gassol",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 733,
      "stateId": 35,
      "name": "Ibi",
      "zoneId": 4,
      "needsReview": true
    },
    {
      "id": 734,
      "stateId": 35,
      "name": "Jalingo",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 735,
      "stateId": 35,
      "name": "Karim Lamido",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 736,
      "stateId": 35,
      "name": "Kurmi",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 737,
      "stateId": 35,
      "name": "Lau",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 738,
      "stateId": 35,
      "name": "Sardauna",
      "zoneId": 8,
      "needsReview": true
    },
    {
      "id": 739,
      "stateId": 35,
      "name": "Takum",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 740,
      "stateId": 35,
      "name": "Ussa",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 741,
      "stateId": 35,
      "name": "Wukari",
      "zoneId": 3,
      "needsReview": true
    },
    {
      "id": 742,
      "stateId": 35,
      "name": "Yorro",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 743,
      "stateId": 35,
      "name": "Zing",
      "zoneId": 4,
      "needsReview": false
    },
    {
      "id": 744,
      "stateId": 36,
      "name": "Bade",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 745,
      "stateId": 36,
      "name": "Bursari",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 746,
      "stateId": 36,
      "name": "Damaturu",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 747,
      "stateId": 36,
      "name": "Fika",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 748,
      "stateId": 36,
      "name": "Fune",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 749,
      "stateId": 36,
      "name": "Geidam",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 750,
      "stateId": 36,
      "name": "Gujba",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 751,
      "stateId": 36,
      "name": "Gulani",
      "zoneId": 5,
      "needsReview": true
    },
    {
      "id": 752,
      "stateId": 36,
      "name": "Jakusko",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 753,
      "stateId": 36,
      "name": "Karasuwa",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 754,
      "stateId": 36,
      "name": "Machina",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 755,
      "stateId": 36,
      "name": "Nangere",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 756,
      "stateId": 36,
      "name": "Nguru",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 757,
      "stateId": 36,
      "name": "Potiskum",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 758,
      "stateId": 36,
      "name": "Tarmuwa",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 759,
      "stateId": 36,
      "name": "Yunusari",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 760,
      "stateId": 36,
      "name": "Yusufari",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 761,
      "stateId": 37,
      "name": "Anka",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 762,
      "stateId": 37,
      "name": "Bakura",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 763,
      "stateId": 37,
      "name": "Birnin Magaji/Kiyaw",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 764,
      "stateId": 37,
      "name": "Bukkuyum",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 765,
      "stateId": 37,
      "name": "Bungudu",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 766,
      "stateId": 37,
      "name": "Gummi",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 767,
      "stateId": 37,
      "name": "Gusau",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 768,
      "stateId": 37,
      "name": "Kaura Namoda",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 769,
      "stateId": 37,
      "name": "Maradun",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 770,
      "stateId": 37,
      "name": "Maru",
      "zoneId": 6,
      "needsReview": true
    },
    {
      "id": 771,
      "stateId": 37,
      "name": "Shinkafi",
      "zoneId": 7,
      "needsReview": true
    },
    {
      "id": 772,
      "stateId": 37,
      "name": "Talata Mafara",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 773,
      "stateId": 37,
      "name": "Tsafe",
      "zoneId": 6,
      "needsReview": false
    },
    {
      "id": 774,
      "stateId": 37,
      "name": "Zurmi",
      "zoneId": 6,
      "needsReview": true
    }
  ],
  "zones": [
    {
      "id": 3,
      "name": "Derived Savanna"
    },
    {
      "id": 2,
      "name": "Humid Forest (rainforest)"
    },
    {
      "id": 1,
      "name": "Mangrove / Freshwater Swamp (coastal)"
    },
    {
      "id": 8,
      "name": "Mid-altitude (Jos Plateau / highlands)"
    },
    {
      "id": 5,
      "name": "Northern Guinea Savanna"
    },
    {
      "id": 7,
      "name": "Sahel Savanna"
    },
    {
      "id": 4,
      "name": "Southern Guinea Savanna"
    },
    {
      "id": 6,
      "name": "Sudan Savanna"
    }
  ],
  "crops": [
    {
      "id": 2,
      "name": "Cassava"
    },
    {
      "id": 7,
      "name": "Cowpea"
    },
    {
      "id": 8,
      "name": "Groundnut"
    },
    {
      "id": 11,
      "name": "Irish potato"
    },
    {
      "id": 1,
      "name": "Maize"
    },
    {
      "id": 6,
      "name": "Millet"
    },
    {
      "id": 4,
      "name": "Rice"
    },
    {
      "id": 5,
      "name": "Sorghum"
    },
    {
      "id": 9,
      "name": "Soybean"
    },
    {
      "id": 10,
      "name": "Tomato"
    },
    {
      "id": 3,
      "name": "Yam"
    }
  ],
  "calendar": [
    {
      "zoneId": 1,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 1,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 2,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 1,
      "seasonLabel": "first_season",
      "activity": "plant",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 1,
      "seasonLabel": "first_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 1,
      "seasonLabel": "first_season",
      "activity": "harvest",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 1,
      "seasonLabel": "first_season",
      "activity": "harvest",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 1,
      "seasonLabel": "second_season",
      "activity": "plant",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 1,
      "seasonLabel": "second_season",
      "activity": "plant",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 1,
      "seasonLabel": "second_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 1,
      "seasonLabel": "second_season",
      "activity": "harvest",
      "month": 12,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 1,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 12,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 1,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 1,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 2,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 2,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 2,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 1,
      "seasonLabel": "first_season",
      "activity": "plant",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 8,
      "seasonLabel": "first_season",
      "activity": "plant",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 1,
      "seasonLabel": "first_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 8,
      "seasonLabel": "first_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 1,
      "seasonLabel": "first_season",
      "activity": "harvest",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 8,
      "seasonLabel": "first_season",
      "activity": "harvest",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 1,
      "seasonLabel": "first_season",
      "activity": "harvest",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 8,
      "seasonLabel": "first_season",
      "activity": "harvest",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 1,
      "seasonLabel": "second_season",
      "activity": "plant",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 7,
      "seasonLabel": "second_season",
      "activity": "plant",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 1,
      "seasonLabel": "second_season",
      "activity": "plant",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 7,
      "seasonLabel": "second_season",
      "activity": "plant",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "plant",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "plant",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 1,
      "seasonLabel": "second_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 7,
      "seasonLabel": "second_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 1,
      "seasonLabel": "second_season",
      "activity": "harvest",
      "month": 12,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 12,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 12,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 7,
      "seasonLabel": "second_season",
      "activity": "harvest",
      "month": 12,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 2,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 12,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 1,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 1,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 2,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 2,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 2,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 1,
      "seasonLabel": "first_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 8,
      "seasonLabel": "first_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 1,
      "seasonLabel": "first_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 8,
      "seasonLabel": "first_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 9,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 9,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 1,
      "seasonLabel": "first_season",
      "activity": "harvest",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 8,
      "seasonLabel": "first_season",
      "activity": "harvest",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 1,
      "seasonLabel": "second_season",
      "activity": "plant",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 7,
      "seasonLabel": "second_season",
      "activity": "plant",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 1,
      "seasonLabel": "first_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 8,
      "seasonLabel": "first_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 1,
      "seasonLabel": "second_season",
      "activity": "plant",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 7,
      "seasonLabel": "second_season",
      "activity": "plant",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "plant",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 9,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "plant",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 1,
      "seasonLabel": "second_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 7,
      "seasonLabel": "second_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 1,
      "seasonLabel": "second_season",
      "activity": "harvest",
      "month": 12,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 12,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 12,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 7,
      "seasonLabel": "second_season",
      "activity": "harvest",
      "month": 12,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 3,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 12,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 1,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 1,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 2,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 2,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 9,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 9,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 9,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "plant",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 9,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "plant",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 4,
      "cropId": 2,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 12,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 1,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 2,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 6,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 9,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 6,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 9,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 6,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 6,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 9,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "plant",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 3,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 9,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 5,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "plant",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 1,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 2,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 6,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 6,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 6,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 6,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "plant",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 4,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 6,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 6,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "plant",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 2,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 6,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 6,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 6,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 6,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "plant",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 7,
      "cropId": 10,
      "seasonLabel": "dry_season",
      "activity": "plant",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 11,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 2,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 11,
      "seasonLabel": "dry_season",
      "activity": "harvest",
      "month": 3,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 11,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 4,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 11,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 5,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 9,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 6,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 9,
      "seasonLabel": "main_season",
      "activity": "plant",
      "month": 7,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 11,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 8,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 11,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 9,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 1,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 7,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 8,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 9,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 11,
      "seasonLabel": "dry_season",
      "activity": "plant",
      "month": 10,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 5,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 9,
      "seasonLabel": "main_season",
      "activity": "harvest",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    },
    {
      "zoneId": 8,
      "cropId": 11,
      "seasonLabel": "dry_season",
      "activity": "plant",
      "month": 11,
      "status": "draft",
      "source": "DRAFT starter: general agronomic knowledge; unverified. Confirm vs FAO Crop Calendar / NiMet SCP / NAERLS-ADP"
    }
  ]
} as const;

export type FarmGuideState = (typeof farmGuideData.states)[number];
export type FarmGuideLocation = (typeof farmGuideData.locations)[number];
export type FarmGuideZone = (typeof farmGuideData.zones)[number];
export type FarmGuideActivity = (typeof farmGuideData.calendar)[number]['activity'];
export type FarmGuideCalendarEntry = (typeof farmGuideData.calendar)[number];

export function getFarmGuideLocations(stateId: number) {
  return farmGuideData.locations.filter((location) => location.stateId === stateId);
}

export function getFarmGuideLocation(locationId: number) {
  return farmGuideData.locations.find((location) => location.id === locationId);
}

export function getFarmGuideZone(zoneId: number) {
  return farmGuideData.zones.find((zone) => zone.id === zoneId);
}

export function getFarmGuideCalendarEntries(zoneId: number, month: number, activity: FarmGuideActivity) {
  return farmGuideData.calendar
    .filter((entry) => entry.zoneId === zoneId && entry.month === month && entry.activity === activity)
    .flatMap((entry) => {
      const crop = farmGuideData.crops.find((item) => item.id === entry.cropId);
      return crop ? [{ ...entry, crop: crop.name }] : [];
    });
}

export function getFarmGuideSeasonLabels(zoneId: number, month: number) {
  return [...new Set(farmGuideData.calendar
    .filter((entry) => entry.zoneId === zoneId && entry.month === month)
    .map((entry) => entry.seasonLabel))];
}
