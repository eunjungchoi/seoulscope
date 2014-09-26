(function() {
	document.getElementById("loader").classList.add("show");
})();

function onClientLoad() {
	angular.bootstrap(document, ['seoulscope']);
}
