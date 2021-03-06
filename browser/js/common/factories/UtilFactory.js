app.factory('Utils', function($http){

    var state_hash =  [
        {
            "name": "Alabama",
            "abbreviation": "AL"
        },
        {
            "name": "Alaska",
            "abbreviation": "AK"
        },
        {
            "name": "American Samoa",
            "abbreviation": "AS"
        },
        {
            "name": "Arizona",
            "abbreviation": "AZ"
        },
        {
            "name": "Arkansas",
            "abbreviation": "AR"
        },
        {
            "name": "California",
            "abbreviation": "CA"
        },
        {
            "name": "Colorado",
            "abbreviation": "CO"
        },
        {
            "name": "Connecticut",
            "abbreviation": "CT"
        },
        {
            "name": "Delaware",
            "abbreviation": "DE"
        },
        {
            "name": "District Of Columbia",
            "abbreviation": "DC"
        },
        {
            "name": "Federated States Of Micronesia",
            "abbreviation": "FM"
        },
        {
            "name": "Florida",
            "abbreviation": "FL"
        },
        {
            "name": "Georgia",
            "abbreviation": "GA"
        },
        {
            "name": "Guam",
            "abbreviation": "GU"
        },
        {
            "name": "Hawaii",
            "abbreviation": "HI"
        },
        {
            "name": "Idaho",
            "abbreviation": "ID"
        },
        {
            "name": "Illinois",
            "abbreviation": "IL"
        },
        {
            "name": "Indiana",
            "abbreviation": "IN"
        },
        {
            "name": "Iowa",
            "abbreviation": "IA"
        },
        {
            "name": "Kansas",
            "abbreviation": "KS"
        },
        {
            "name": "Kentucky",
            "abbreviation": "KY"
        },
        {
            "name": "Louisiana",
            "abbreviation": "LA"
        },
        {
            "name": "Maine",
            "abbreviation": "ME"
        },
        {
            "name": "Marshall Islands",
            "abbreviation": "MH"
        },
        {
            "name": "Maryland",
            "abbreviation": "MD"
        },
        {
            "name": "Massachusetts",
            "abbreviation": "MA"
        },
        {
            "name": "Michigan",
            "abbreviation": "MI"
        },
        {
            "name": "Minnesota",
            "abbreviation": "MN"
        },
        {
            "name": "Mississippi",
            "abbreviation": "MS"
        },
        {
            "name": "Missouri",
            "abbreviation": "MO"
        },
        {
            "name": "Montana",
            "abbreviation": "MT"
        },
        {
            "name": "Nebraska",
            "abbreviation": "NE"
        },
        {
            "name": "Nevada",
            "abbreviation": "NV"
        },
        {
            "name": "New Hampshire",
            "abbreviation": "NH"
        },
        {
            "name": "New Jersey",
            "abbreviation": "NJ"
        },
        {
            "name": "New Mexico",
            "abbreviation": "NM"
        },
        {
            "name": "New York",
            "abbreviation": "NY"
        },
        {
            "name": "North Carolina",
            "abbreviation": "NC"
        },
        {
            "name": "North Dakota",
            "abbreviation": "ND"
        },
        {
            "name": "Northern Mariana Islands",
            "abbreviation": "MP"
        },
        {
            "name": "Ohio",
            "abbreviation": "OH"
        },
        {
            "name": "Oklahoma",
            "abbreviation": "OK"
        },
        {
            "name": "Oregon",
            "abbreviation": "OR"
        },
        {
            "name": "Palau",
            "abbreviation": "PW"
        },
        {
            "name": "Pennsylvania",
            "abbreviation": "PA"
        },
        {
            "name": "Puerto Rico",
            "abbreviation": "PR"
        },
        {
            "name": "Rhode Island",
            "abbreviation": "RI"
        },
        {
            "name": "South Carolina",
            "abbreviation": "SC"
        },
        {
            "name": "South Dakota",
            "abbreviation": "SD"
        },
        {
            "name": "Tennessee",
            "abbreviation": "TN"
        },
        {
            "name": "Texas",
            "abbreviation": "TX"
        },
        {
            "name": "Utah",
            "abbreviation": "UT"
        },
        {
            "name": "Vermont",
            "abbreviation": "VT"
        },
        {
            "name": "Virgin Islands",
            "abbreviation": "VI"
        },
        {
            "name": "Virginia",
            "abbreviation": "VA"
        },
        {
            "name": "Washington",
            "abbreviation": "WA"
        },
        {
            "name": "West Virginia",
            "abbreviation": "WV"
        },
        {
            "name": "Wisconsin",
            "abbreviation": "WI"
        },
        {
            "name": "Wyoming",
            "abbreviation": "WY"
        }
    ];

    function getStates(){
        return state_hash;
    }

    var defaultImages = {
        basketball: 'http://designyoutrust.com/wp-content/uploads/2014/01/This_Game_We_Play_NYC_Basketball_Courts_by_Franck-_Bohbot_2014_03.jpg',
        climbing: 'http://www.glappitnova.com/wp-content/uploads/2015/07/BKBChicago-South-Building-Climbing-Wall.jpg',
        soccer: 'http://www3.pictures.zimbio.com/gi/New+York+Red+Bulls+Mayor+Bloomberg+Open+New+F9Zo2WoP7g-l.jpg',
        baseball: 'http://www.suitcasegetaways.com/wp-content/uploads/2014/08/NYC-Central-Park-Heckscher-BallFields-South-End-9296-14-1030x686.jpg',
        football: 'http://www.psal.org/images/Articles/2015/201507231059035908.jpg',
        lifting: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRE65QAInXpHJuUmCZ37Xlf5RsxJtweqWAuewMUMkdh4y-v6sN5W5DNBIg',
        skiing: 'http://www.home-hunts.net/wp-content/uploads/2015/01/Cauterets-skiing.jpg',
        cycling: 'http://www.msnbc.com/sites/msnbc/files/2013/05/ap02050502257_1.jpg',
        tennis: 'http://images.nymag.com/guides/everything/tennis/publiccourts080505_1_560.jpg',
        hockey: 'http://flamesnation.ca/uploads/Image/Rink1.jpg',
        golf: 'http://static5.businessinsider.com/image/545a7fa56da811d8628b456d-1200/trump-golf-links-ferry-point.jpg',
        bowling: 'http://www.nycgo.com/images/uploadedimages/devnycvisitcom/venue/brooklynbowl_v2_460x285.jpg'
    }

    var sportsList = ["Basketball", "Climbing", "Soccer", "Baseball", "Football", "Lifting", "Skiing", "Cycling", 'Tennis', 'Hockey', 'Golf', 'Bowling'];

    function getCoordinates(address){
        var url = 'http://maps.google.com/maps/api/geocode/json?address='+address+'&sensor=false';
        return $http.get(url);
    }
   var sportCardImages = {
        basketball: 'sportcardimages/basketball.png',
        climbing: 'sportcardimages/climbing.png',
        soccer: 'sportcardimages/soccer.png',
        baseball: 'sportcardimages/baseball.png',
        football: 'sportcardimages/football.png',
        lifting: 'sportcardimages/weights.png',
        skiing: 'sportcardimages/skiing.png',
        hockey: 'sportcardimages/hockey.png',
        golf: 'sportcardimages/golf.png',
        bowling: 'sportcardimages/bowling.png',
        cycling: 'mapicons/cycling.png',
        tennis: 'mapicons/tennis.png',
   }
   var mapIconUrls = {
        basketball: 'mapicons/basketball.png',
        climbing: 'mapicons/climbing.png',
        soccer: 'mapicons/soccer.png',
        baseball: 'mapicons/baseball.png',
        football: 'mapicons/usfootball.png',
        lifting: 'mapicons/weights.png',
        skiing: 'mapicons/skiing.png',
        cycling: 'mapicons/cycling.png',
        tennis: 'mapicons/tennis.png',
        hockey: 'mapicons/hockey.png',
        golf: 'mapicons/golf.png',
        bowling: 'mapicons/bowling.png'
    }

    return {
        getStates: getStates,
        defaultImages: defaultImages,
        sportsList: sportsList,
        getCoordinates: getCoordinates,
        mapIconUrls: mapIconUrls,
        sportCardImages: sportCardImages
    }
});
