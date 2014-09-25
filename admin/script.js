(function() {
	document.getElementById("loader").classList.add("show");
})();

var G = {
	api_key: "AIzaSyCUphKCCMUpng-f3DZEiCGhT8j06GliYRo",
	client_id: "523831962603-epe6gir9d2q4pjv08kgo4nn75ogguj8c.apps.googleusercontent.com",
	scope: "https://www.googleapis.com/auth/plus.me https://www.googleapis.com/auth/fusiontables https://picasaweb.google.com/data/",
	currentUser: null,
	hash: null,
}

function checkAuth() {
	console.log("authorize");
	gapi.auth.authorize({
			client_id: G.client_id,
			scope: G.scope,
			immediate: true,
		},
		function(response) {
			// console.log(response);

			document.getElementById("loader").classList.remove("show");
			G.hash = window.location.hash;
			window.location.hash = "";

			if ( response && !response.error ) {
				G.currentUser = {
					id: null,
					name: 'g',
					token: response.access_token,
					token_type: response.token_type,
				}

				gapi.client.load('plus', 'v1', function() {
          			var request = gapi.client.plus.people.get({
            			'userId': 'me'
          			});
					request.execute(function(resp) {
						// console.log("plus : ", resp)
						G.currentUser.id = resp.id,

						angular.bootstrap(document, ['seoulscope']);
					});
    	    	});
			} else {
				console.log("Not.");
				angular.bootstrap(document, ['seoulscope']);
			}

		}
	);
}

function handleClientLoad() {
	gapi.client.load('fusiontables', 'v1', function() { console.log("loaded") });

	gapi.client.setApiKey(G.api_key);
	window.setTimeout(checkAuth, 1);
}

function disconnectUser() {
  var revokeUrl = 'https://accounts.google.com/o/oauth2/revoke?token=' +
      G.currentUser.token;

  // Perform an asynchronous GET request.
  $.ajax({
    type: 'GET',
    url: revokeUrl,
    async: false,
    contentType: "application/json",
    dataType: 'jsonp',
    success: function(nullResponse) {
      // Do something now that user is disconnected
      // The response is always undefined.
    },
    error: function(e) {
      // Handle the error
      console.log(e);
      // You could point users to manually disconnect if unsuccessful
      // https://plus.google.com/apps
    }
  });
}

function t() {
console.log(angular.element(document.body).scope());
	// angular.element(document.body).scope().login();
}