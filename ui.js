// Define UI elements
var ui = {
	timer: document.getElementById('timer'),
	robotState: document.getElementById('robot-state'),
	gyro: {
		container: document.getElementById('gyro'),
		val: 0,
		offset: 0,
		visualVal: 0,
		arm: document.getElementById('gyro-arm'),
		number: document.getElementById('gyro-number')
	},
	robot: {
		diagram: document.getElementById('robot-diagram'),
		arm: document.getElementById('robot-arm'),
		winchTrim: document.querySelectorAll('#trim-winch rect')[0],
		winchOpen: false
	},
	tuning: {
		list: document.getElementById('tuning'),
		button: document.getElementById('tuning-button'),
		name: document.getElementById('name'),
		value: document.getElementById('value'),
		set: document.getElementById('set'),
		get: document.getElementById('get')
	},
	auto: {
		button: document.getElementById('auto-button'),
		pane: document.getElementById('auto'),
		defensesAZ: ['A', 'B', 'C', 'D'],
		defenseIDs: [
			['A0', 'A1'],
			['E0', 'E0'],
			['C1', 'C1'],
			['E0', 'E0']
		],
        // This variable will be replaced later on with the image elements in
        // all the <td>s (once they're generated).
		defenses: document.querySelectorAll('#defenses td:not(:first-child)'),
		robots: document.getElementsByClassName('autobot'),
		robotStatuses: ['empty', 'allied', 'us']
	},
	autoSelect: document.getElementById('auto-select'),
	flashlight: document.getElementById('bulb'),
	autoAim: document.getElementById('auto-aim'),
	theme: {
		select: document.getElementById('theme-select'),
		link: document.getElementById('theme-link')
	},
	camera: {
		viewer: document.getElementById('camera'),
		id: 0,
		srcs: [ // Will default to first source
			'http://10.14.18.2:5800/?action=stream',
			'http://10.14.18.2:5801/?action=stream'
		]
	}
};

// Sets function to be called on NetworkTables connect. Commented out because it's usually not necessary.
// NetworkTables.addWsConnectionListener(onNetworkTablesConnection, true);
// Sets function to be called when robot dis/connects
NetworkTables.addRobotConnectionListener(onRobotConnection, true);
// Sets function to be called when any NetworkTables key/value changes
NetworkTables.addGlobalListener(onValueChanged, true);


function onRobotConnection(connected) {
	var state = connected ? 'Robot connected!' : 'Robot disconnected.';
	console.log(state);
	ui.robotState.innerHTML = state;
}

function onValueChanged(key, value, isNew) {
	// Sometimes, NetworkTables will pass booleans as strings. This corrects for that.
	if (value === 'true') value = true;
	if (value === 'false') value = false;

	// This switch statement chooses which UI element to update when a NetworkTables variable changes.
	switch (key) {
		case '/SmartDashboard/Drive/NavX | Yaw': // Gyro rotation
			ui.gyro.val = value;
			ui.gyro.visualVal = Math.floor(ui.gyro.val - ui.gyro.offset);
			if (ui.gyro.visualVal < 0) { // Corrects for negative values
				ui.gyro.visualVal += 360;
			}
			ui.gyro.arm.style.transform = ('rotate(' + ui.gyro.visualVal + 'deg)');
			ui.gyro.number.innerHTML = ui.gyro.visualVal + 'º';
			break;
		case '/SmartDashboard/timeRunning':
			// When this NetworkTables variable is true, the timer will start.
			// You shouldn't need to touch this code, but it's documented anyway in case you do.
			var s = 135;
			if (value) {
				// Make sure timer is reset to black when it starts
				ui.timer.style.color = 'black';
				// Function below adjusts time left every second
				var countdown = setInterval(function() {
					s--; // Subtract one second
					// Minutes (m) is equal to the total seconds divided by sixty with the decimal removed.
					var m = Math.floor(s / 60);
					// Create seconds number that will actually be displayed after minutes are subtracted
					var visualS = (s % 60);

					// Add leading zero if seconds is one digit long, for proper time formatting.
					visualS = visualS < 10 ? '0' + visualS : visualS;

					if (s < 0) {
						// Stop countdown when timer reaches zero
						clearTimeout(countdown);
						return;
					} else if (s <= 15) {
						// Flash timer if less than 15 seconds left
						ui.timer.style.color = (s % 2 === 0) ? '#FF3030' : 'transparent';
					} else if (s <= 30) {
						// Solid red timer when less than 30 seconds left.
						ui.timer.style.color = '#FF3030';
					}
					ui.timer.innerHTML = m + ':' + visualS;
				}, 1000);
			} else {
				s = 135;
			}
			NetworkTables.setValue(key, false);
			break;
		case '/SmartDashboard/Autonomous Mode/options': // Load list of prewritten autonomous modes
			// Clear previous list
			while (ui.autoSelect.firstChild) {
				ui.autoSelect.removeChild(ui.autoSelect.firstChild);
			}
			// Make an option for each autonomous mode and put it in the selector
			for (i = 0; i < value.length; i++) {
				var option = document.createElement('option');
				option.innerHTML = value[i];
				ui.autoSelect.appendChild(option);
			}
			// Set value to the already-selected mode. If there is none, nothing will happen.
			ui.autoSelect.value = NetworkTables.getValue('/SmartDashboard/currentlySelectedMode');
			break;
		case '/SmartDashboard/Autonomous Mode/selected':
			ui.autoSelect.value = value;
			break;
		case '/SmartDashboard/theme':
			ui.theme.select.value = value;
			ui.theme.link.href = 'css/' + value + '.css';
			break;
		case '/SmartDashboard/LightBulb':
			ui.flashlight.parentNode.className = value ? 'active' : '';
			break;
		case '/SmartDashboard/Drive/autoAim':
			ui.autoAim.parentNode.className = value ? 'active' : '';
			break;
		case '/SmartDashboard/attackerState0':
		case '/SmartDashboard/attackerState1':
		case '/SmartDashboard/attackerState2':
		case '/SmartDashboard/attackerState3':
		case '/SmartDashboard/attackerState4':
            // If the value of an autonomous bot icon changes, apply the new icon.

            // Get the number of the bot from the last char of the key
            // TODO if bored: Make this compatible with a multi-digit number.
            // Wouldn't be useful, but would appease Erik's OCD.
			var thisBot = ui.auto.robots[key[key.length - 1]];
            // Set the value.
			thisBot.state = value;
			// TODO: Only allow two allies and one us to be selected. Currently you
            // can have as many as you want of both, despite that being impossible IRL.

            // Choose the appropriate image to represent the state of the selector.
			switch (thisBot.state) {
				case 0:
					thisBot.src = 'img/auto/no-robot.png';
					break;
				case 1:
					thisBot.src = 'img/auto/allied.png';
					break;
				case 2:
					thisBot.src = 'img/auto/us.png';
					break;
			}
			break;
        case '/SmartDashboard/defenseSelector1':
		case '/SmartDashboard/defenseSelector2':
		case '/SmartDashboard/defenseSelector3':
		case '/SmartDashboard/defenseSelector4':
            // Manage updates to the defense selectors in the auto pane.
			// TODO: Why call the NT vals "defenseSelector?" Not a very apt name,
			// since the dashboard is not the only thing to use these values.
			// This will need to be changed in robot code as well,
			// hence why I'm leaving it like this for now.

            // Store which defense the NT value refers to.
			var thisDefense = ui.auto.defenses[key[key.length - 1]];

            // Set the defense's class (numeric index of a letter from A-D) and number (binary digit).
            // Read the Stronghold rules for more info on how this system works.
			thisDefense.defenseClass = ui.auto.defensesAZ.indexOf(value[0]);
			thisDefense.defenseNumber = parseInt(value[1]);

            // Set the source of the image. Aaaaaaand we're done.
			thisDefense.src = 'img/auto/' + value + '.png';
			break;
	}

	// The following code manages tuning section of the interface.
	// This section displays a list of all NetworkTables variables (that start with /SmartDashboard/) and allows you to directly manipulate them.
	var propName = key.substring(16, key.length);
	// Check if value is new and doesn't have a spot on the list yet
	if (isNew && !document.getElementsByName(propName)[0]) {
		// Make sure name starts with /SmartDashboard/. Properties that don't are technical and don't need to be shown on the list.
		if (key.substring(0, 16) === '/SmartDashboard/') {
			// Make a new div for this value
			var div = document.createElement('div'); // Make div
			ui.tuning.list.appendChild(div); // Add the div to the page

			var p = document.createElement('p'); // Make a <p> to display the name of the property
			p.innerHTML = propName; // Make content of <p> have the name of the NetworkTables value
			div.appendChild(p); // Put <p> in div

			var input = document.createElement('input'); // Create input
			input.name = propName; // Make its name property be the name of the NetworkTables value
			input.value = value; // Set
			// The following statement figures out which data type the variable is.
			// If it's a boolean, it will make the input be a checkbox. If it's a number,
			// it will make it a number chooser with up and down arrows in the box. Otherwise, it will make it a textbox.
			if (value === true || value === false) { // Is it a boolean value?
				input.type = 'checkbox';
				input.checked = value; // value property doesn't work on checkboxes, we'll need to use the checked property instead
			} else if (!isNaN(value)) { // Is the value not not a number? Great!
				input.type = 'number';
			} else { // Just use a text if there's no better manipulation method
				input.type = 'text';
			}
			// Create listener for value of input being modified
			input.onchange = function() {
				switch (input.type) { // Figure out how to pass data based on data type
					case 'checkbox':
						// For booleans, send bool of whether or not checkbox is checked
						NetworkTables.setValue(key, input.checked);
						break;
					case 'number':
						// For number values, send value of input as an int.
						NetworkTables.setValue(key, parseInt(input.value));
						break;
					case 'text':
						// For normal text values, just send the value.
						NetworkTables.setValue(key, input.value);
						break;
				}
			};
			// Put the input into the div.
			div.appendChild(input);
		}
	} else { // If the value is not new
		// Find already-existing input for changing this variable
		var oldInput = document.getElementsByName(propName)[0];
		if (oldInput) { // If there is one (there should be, unless something is wrong)
			if (oldInput.type === 'checkbox') { // Figure out what data type it is and update it in the list
				oldInput.checked = value;
			} else {
				oldInput.value = value;
			}
		} else {
			console.log('Error: Non-new variable ' + key + ' not present in tuning list!');
		}
	}

}

// Reset gyro value to 0 on click
ui.gyro.container.onclick = function() {
	// Store previous gyro val, will now be subtracted from val for callibration
	ui.gyro.offset = ui.gyro.val;
	// Trigger the gyro to recalculate value.
	onValueChanged('/SmartDashboard/drive/navX/yaw', ui.gyro.val);
};

// Open tuning section when button is clicked
ui.tuning.button.onclick = function() {
	if (ui.tuning.list.style.display === 'none') {
		ui.tuning.list.style.display = 'block';
	} else {
		ui.tuning.list.style.display = 'none';
	}
};
// Open tuning section when button is clicked
ui.auto.button.onclick = function() {
	if (ui.auto.pane.style.display === 'none') {
		ui.auto.pane.style.display = 'block';
	} else {
		ui.auto.pane.style.display = 'none';
	}
};

// Manages get and set buttons at the top of the tuning pane
ui.tuning.set.onclick = function() {
	// Make sure the inputs have content, if they do update the NT value
	if (ui.tuning.name.value && ui.tuning.value.value) {
		NetworkTables.setValue('/SmartDashboard/' + ui.tuning.name.value, ui.tuning.value.value);
	}
};
ui.tuning.get.onclick = function() {
	ui.tuning.value.value = NetworkTables.getValue(ui.tuning.name.value);
};

// Update NetworkTables when autonomous selector is changed
// TODO: Move this to the autonomous pane.
ui.autoSelect.onchange = function() {
	NetworkTables.setValue('/SmartDashboard/Autonomous Mode/selected', this.value);
};

// When theme selection is made, turn on that theme
ui.theme.select.onchange = function() {
	NetworkTables.setValue('/SmartDashboard/theme', this.value);
};

// When camera is clicked on, change camera sources
ui.camera.viewer.onclick = function() {
	ui.camera.id += 1;
	if (ui.camera.id === ui.camera.srcs.length) ui.camera.id = 0;
	ui.camera.viewer.style.backgroundImage = 'url(' + ui.camera.srcs[ui.camera.id] + ')';
};

ui.robot.diagram.onclick = function() {
	var anim;
	if (ui.robot.winchOpen) {
		anim = setInterval(function() {
			ui.robot.winchTrim.getAttributeNode('y').nodeValue *= 1.01;
			if (ui.robot.winchTrim.getAttributeNode('y').nodeValue >= 400) {
				clearTimeout(anim);
			}
		}, 1);
		ui.robot.winchOpen = false;
	} else {
		anim = setInterval(function() {
			ui.robot.winchTrim.getAttributeNode('y').nodeValue /= 1.01;
			if (ui.robot.winchTrim.getAttributeNode('y').nodeValue <= 100) {
				clearTimeout(anim);
			}
		}, 1);
		ui.robot.winchOpen = true;
	}
};

ui.flashlight.onclick = function() {
	NetworkTables.setValue('/SmartDashboard/LightBulb', (ui.flashlight.parentNode.className === 'active') ? false : true);
};

ui.autoAim.onclick = function() {
	NetworkTables.setValue('/SmartDashboard/Drive/autoAim', (ui.autoAim.parentNode.className === 'active') ? false : true);
};



// AUTONOMOUS PANE MANAGEMENT


// Go through the <td>s in the table in the autonomous pane that are for defenses.
// For each one, add a display image along with up & down buttons.
for (i = 0; i < ui.auto.defenses.length; i++) {
    // Create up arrow element.
	var arrowUp = document.createElement('div');
    // Give it the appropriate class.
	arrowUp.className = 'arrow-up';
    // Put it into the <td>.
	ui.auto.defenses[i].appendChild(arrowUp);

    // Create image element.
	var img = document.createElement('img');
    // Give it the appropriate class name.
	img.className = 'defense';
    // Give it the default source.
	img.src = 'img/auto/no-defense.png';
    // Give it the default class, number, and position number.
    // These will be overridden if data is retrieved from NetworkTables.
	img.defenseClass = 0;
	img.defenseNumber = 0;
    // position needs to be increased because lowbar element is not modified
    // by this for loop.
	img.position = i + 1;
    // Put the image into the <td>.
	ui.auto.defenses[i].appendChild(img);

    // Create down arrow element.
	var arrowDown = document.createElement('div');
    // Give it the appropriate class name.
	arrowDown.className = 'arrow-down';
    // Put it into the <td>.
	ui.auto.defenses[i].appendChild(arrowDown);
}

// Redefine the defenses object so that it refers to the images instead of the <td>s.
// TODO: Check if this is bad practice.
ui.auto.defenses = document.getElementsByClassName('defense');

// Go through each of the <td>s in the table that are for robots.
for (i = 0; i < ui.auto.robots.length; i++) {
    // Set the default state (empty).
	ui.auto.robots[i].state = 0;
    // Set a position property to easily fetch to figure out which robot icon was clicked.
	ui.auto.robots[i].position = i;
    // Set default robot image (empty).
	ui.auto.robots[i].src = 'img/auto/no-robot.png';
}

// Click handler for everything in the autonomous pane.
// Includes auto bots, defense images, and up/down buttons for defenses.
ui.auto.pane.onclick = function(e) {
    // Do different things based on what they clicked on.
	switch (e.target.className) {
        // If they clicked on a robot icon.
        // Also, obligatory:
		// AUTOBOTS ASSEMBLE
		case 'autobot':
            // Figure out what the new state should be.
			// Need non-strict equals here, .state prop will be returned as string.
            // TODO: Do this only after the data has been retrieved from NT.
			if (e.target.state == 2) {
				e.target.state = 0;
			} else {
				e.target.state++;
			}
            // Update the NetworkTables value.
            // The code in the onValueChanged() function above will take it from here.
			NetworkTables.setValue('/SmartDashboard/attackerState' + e.target.position, e.target.state);
			break;
		case 'arrow-up':
		case 'arrow-down':
            // If an up/down arrow was clicked.
            // Get the corresponding <img>'s defense's class.
			var defenseClass = e.target.parentNode.childNodes[1].defenseClass;

            // If the up arrow was clicked, increase the class. If down, decrease it.
			defenseClass += (e.target.className === 'arrow-up') ? 1 : -1;

            // If the above operation moved to a nonexistent class, then cycle it back to the other side.
			if (defenseClass > 3) {
				defenseClass = 0;
			} else if (defenseClass < 0) {
				defenseClass = 3;
			}

            // Set the value in NetworkTables.
			NetworkTables.setValue('/SmartDashboard/defenseSelector' + e.target.parentNode.childNodes[1].position, ui.auto.defensesAZ[defenseClass] + e.target.parentNode.childNodes[1].defenseNumber);
			break;
		case 'defense':
            // If it was a defense image that was clicked.
            // Get the number of the defense that's being shown.
            var defenseNumber = e.target.defenseNumber;
            // Switch it around
			defenseNumber = defenseNumber ? 0 : 1;

            // Set the variable in NetworkTables.
            NetworkTables.setValue('/SmartDashboard/defenseSelector' + e.target.position, ui.auto.defensesAZ[e.target.defenseClass] + defenseNumber);
			break;
	}
};

// That's all, folks.
