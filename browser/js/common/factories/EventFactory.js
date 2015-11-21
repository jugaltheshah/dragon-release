app.factory('EventFactory', function(){
	var defaultImages = {
		basketball: 'http://designyoutrust.com/wp-content/uploads/2014/01/This_Game_We_Play_NYC_Basketball_Courts_by_Franck-_Bohbot_2014_03.jpg',
		climbing: 'http://www.glappitnova.com/wp-content/uploads/2015/07/BKBChicago-South-Building-Climbing-Wall.jpg',
		soccer: 'http://www3.pictures.zimbio.com/gi/New+York+Red+Bulls+Mayor+Bloomberg+Open+New+F9Zo2WoP7g-l.jpg',
		baseball: 'http://www.suitcasegetaways.com/wp-content/uploads/2014/08/NYC-Central-Park-Heckscher-BallFields-South-End-9296-14-1030x686.jpg',
 		football: 'http://www.psal.org/images/Articles/2015/201507231059035908.jpg',
 		lifting: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRE65QAInXpHJuUmCZ37Xlf5RsxJtweqWAuewMUMkdh4y-v6sN5W5DNBIg',
		skiing: 'http://www.home-hunts.net/wp-content/uploads/2015/01/Cauterets-skiing.jpg',
		mountainbiking: 'http://finnohara.com/blog/wp-content/uploads/0000_FO_ATHLETES_961_1c_RGB.jpg',
		surfing: 'https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcRcxSIHobLvgXMgy6g0u1yXjq9tH7ecOL03VCVIhmf-5_k9vEJC',
		cycling: 'http://www.msnbc.com/sites/msnbc/files/2013/05/ap02050502257_1.jpg'
	}

	return {
		getUrl: function(type) {
			return defaultImages[type];
		}
	}
})