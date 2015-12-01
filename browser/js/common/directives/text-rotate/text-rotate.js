
app.directive('rotateText',
    function($interval) {

        return function(scope, element, attrs) {

            scope.wordArr=['Ball', 'Swim', 'Goal', 'Tee', 'Tackle', 'Pull', 'Carve', 'Team', 'Lift', 'Climb', 'Belay', 'Cycle', 'Serve', 'Sport'];

            function updateWord(i) {
                var j=(i+1)%5; //(i+1) to start at second word
                //console.log(j);
                element.text(scope.wordArr[j]);
            }

            element.text(scope.wordArr[0]); //displays "fun"
            var stopWord = $interval(updateWord, 2000); //start rotating 1 second after, changes every sec

            // listen on DOM destroy (removal) event
            // to prevent updating word after the DOM element was removed.
            element.on('$destroy', function() {
                $interval.cancel(stopWord);
            });
        }
    });
