import { saveRule, deleteRule, getRules, getItemState, updateItemState  } from './api.js';

let schedules = {

  Zone1: { TimelineName: "timeline1", Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] },
  Zone2: { TimelineName: "timeline2", Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] },
  Zone3: { TimelineName: "timeline3", Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] },
  Zone4: { TimelineName: "timeline4", Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] },
  Zone5: { TimelineName: "timeline5", Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] },
};

const blockTypesOnOff = [
  { id: 'OFF', displayName: 'Off', temperature: 0, color: '#842614', type: "state", script: '', command: 'OFF', icon: 'fa-snowflake'},
  { id: 'ON', displayName: 'On', temperature: 1, color: '#428451', type: "state", script: '', command: 'ON', icon: 'fa-fire' },
];
const blockTypes = [
  ...blockTypesOnOff,
  { id: 'NIGHT', displayName: 'Night (15°C)', temperature: 15, color: '#95a5a6', type: "temp", script: '', command: '15', icon: 'fa-moon' },
  { id: 'AWAY', displayName: 'Away (16°C)', temperature: 16, color: '#867555', type: "temp", script: '', command: '16', icon: 'fa-person-hiking' },
  { id: 'HOME', displayName: 'Home (20°C)', temperature: 20, color: '#c48946', type: "temp", script: '', command: '20', icon: 'fa-house' },
  { id: 'HO', displayName: 'HO (21°C)', temperature: 21, color: '#f49f16', type: "temp", script: '', command: '21', icon: 'fa-computer' },
  { id: 'WARM', displayName: 'Warm (23°C)', temperature: 23, color: '#e74c3c', type: "temp", script: '', command: '23', icon: 'fa-temperature-high' }
];
const zones = [
  { zoneName: "Zone1", defaultBlock: 'OFF', blocksAvaiable: blockTypesOnOff, id: 'general', name: 'Generalna',  itemState: 'Thermostat_HeatingZone_Control', itemTemp: ''  },
  { zoneName: "Zone2", defaultBlock: 'NIGHT', blocksAvaiable: blockTypes, id: 'kitchen', name: 'Kuchnia',   itemState: 'Thermostat_HeatingZone_Kitchen_State', itemTemp: 'Thermostat_HeatingZone_Kitchen'  },
  { zoneName: "Zone3", defaultBlock: 'NIGHT', blocksAvaiable: blockTypes, id: 'living-room', name: 'Salon', itemState: 'Thermostat_HeatingZone_LivingRoom_State', itemTemp: 'Thermostat_HeatingZone_LivingRoom'  },
  { zoneName: "Zone4", defaultBlock: 'NIGHT', blocksAvaiable: blockTypes, id: 'bedroom', name: 'Sypialnia', itemState: 'Thermostat_HeatingZone_Bedroom_State', itemTemp: 'Thermostat_HeatingZone_Bedroom'  },
  { zoneName: "Zone5", defaultBlock: 'NIGHT', blocksAvaiable: blockTypes, id: 'bathroom', name: 'Łazienka', itemState: 'Thermostat_HeatingZone_Bathroom_State', itemTemp: 'Thermostat_HeatingZone_Bathroom'  }
];
const zoneNames = ['Generalna', 'Kuchnia', 'Salon', 'Sypialnia', 'Łazienka'];

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
let activeDay = 'Monday';
let activeZone = 'Zone1';
let selectedBlockIndex = null; // Track selected block index

function showNotification(message, type = "success") {
  const notificationContainer = document.getElementById("notification-container");

  // Create a new notification element
  const notification = document.createElement("div");
  notification.className = `notification ${type}`; // Apply success or error styling
  notification.innerText = message;

  // Append the notification to the container
  notificationContainer.appendChild(notification);

  // Automatically remove the notification after a delay
  setTimeout(() => {
    notification.remove();
  }, 4000); // 4 seconds (matches CSS animation)
}

function parseAndEvaluate(setting, dynamicContext = {}) {
  try {
    // Wrap the setting in a template literal evaluator using dynamic context
    const evaluator = new Function(
      ...Object.keys(dynamicContext), // Pass variable names as arguments
      `return \`${setting}\`;`       // Evaluate as a template literal
    );

    // Pass the corresponding values dynamically
    return evaluator(...Object.values(dynamicContext));
  } catch (error) {
    console.error('Failed to evaluate dynamically:', error);
    throw error;
  }
}

function getPreviousDay(day) {

  const currentIndex = daysOfWeek.indexOf(day);
  if (currentIndex === -1) {
    throw new Error('Invalid day of the week');
  }

  // Calculate the previous day index
  const previousIndex = (currentIndex - 1 + daysOfWeek.length) % daysOfWeek.length;

  return daysOfWeek[previousIndex];
}

function selectDay(day = null) {

  if (!day) {
    // Get current day of the week
    day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  }

  activeDay = day;
  window.activeDay = activeDay;
  document.querySelectorAll(".day-button").forEach(button => button.classList.remove("active"));
  document.querySelector(`button[onclick="selectDay('${day}')"]`).classList.add("active");

  selectedBlockIndex = null; // Reset selected block when switching days
  Object.keys(schedules).forEach(zone => {
    loadScheduleForDay(zone, day);
  });
}

function addBlock(zone, day) {
  const blocks = schedules[zone][day];
  if (blocks.length >= 6) {
    showNotification("You can only add up to 6 blocks.", "error");
    return;
  }

  const zoneData = zones.find(z => z.zoneName === zone);
  const blockData = blockTypes.find((b) => b.id === zoneData.defaultBlock);

  // Add first
  const block = {
    id: blocks.length,
    type: blockData.id,
    temperature: blockData.temperature,
    startTime: blocks.length > 0 ? findMiddleTime(blocks[blocks.length - 1].startTime, blocks[blocks.length - 1].endTime) : "00:00",
    endTime: "06:00"
  };

  blocks.push(block);
  updateBlockTimes(zone);
  renderTimeline(zone);
}

function addZoneNames(zoneNames) {
  zoneNames.forEach((zone, index) => {
    // Dynamically construct timeline container ID
    const timelineContainerId = `timeline-container${index + 1}`; // Assuming timeline4 starts at index 4
    const container = document.getElementById(timelineContainerId);

    if (container) {
      // Create a new element for the zone name
      const zoneNameElement = document.createElement('div');
      zoneNameElement.textContent = zone;
      zoneNameElement.className = 'zone-name'; // Add a class for styling

      // Insert the zone name at the top of the container
      container.prepend(zoneNameElement);
    }
  });
}

function renderTimeline(zone) {
  const timeline = document.getElementById(schedules[zone]["TimelineName"]);
  timeline.innerHTML = ""; // Clear existing blocks
  const blocks = schedules[zone][activeDay];

  blocks.forEach((block, index) => {
    // Find block type definition in blockTypes
    const blockType = blockTypes.find(bt => bt.id === block.type);

    // Create block element
    const blockDiv = document.createElement("div");
    blockDiv.className = "timeline-block";
    blockDiv.style.backgroundColor = blockType?.color || "#CCCCCC"; // Default color if not found

    // Add icon
    const iconElement = document.createElement("i");
    if (blockType?.icon) {
      iconElement.className = `fa ${blockType.icon}`;
    }
    blockDiv.appendChild(iconElement);

    // Add block label
    const label = document.createElement("span");
    label.innerText = ` ${blockType?.displayName || block.type}`;
    blockDiv.appendChild(label);

    blockDiv.onclick = () => selectBlock(zone, index);

    // Calculate block width based on duration
    const durationInMinutes = calculateDuration(block.startTime, block.endTime);
    blockDiv.style.width = `${(durationInMinutes / 1440) * 100}%`;

    // Add drag handle for resizing (if not the last block)
    if (index < blocks.length - 1) {
      const handleDiv = document.createElement("div");
      handleDiv.className = "drag-handle";
      handleDiv.onmousedown = (e) => handleDragStart(e, index, zone);

      // Touch event for dragging on touchscreen
      handleDiv.ontouchstart = (e) => {
        e.preventDefault(); // Prevent scrolling during touch
        handleDragStart(e.touches[0], index, zone);
      };
      blockDiv.appendChild(handleDiv);
    }

    // Highlight selected block
    if (index === selectedBlockIndex) {
      blockDiv.classList.add("selected");
    }

    timeline.appendChild(blockDiv);
  });


  document.getElementById("block-controls").style.display = selectedBlockIndex !== null ? "block" : "none";

  if (selectedBlockIndex !== null) {
    const selectedBlock = blocks[selectedBlockIndex];
    document.getElementById("start-time").value = selectedBlock.startTime;
    document.getElementById("end-time").value = selectedBlock.endTime;
  }
}

function selectBlock(zone, index) {
  selectedBlockIndex = index;
  activeZone = zone;
  window.activeZone = activeZone;

  const startTimeControl = document.getElementById("start-time");
  const endTimeControl = document.getElementById("end-time");
  const blockTypeControl = document.getElementById("block-type");
  const removeButton = document.getElementById("remove-block");

  if (selectedBlockIndex === 0) {
    // Disable controls if the first block is selected
    startTimeControl.disabled = true;
    endTimeControl.disabled = true;
    blockTypeControl.disabled = true;
    removeButton.disabled = true;
  } else if (selectedBlockIndex !== null) {
    // Enable controls for other blocks
    startTimeControl.disabled = false;
    endTimeControl.disabled = false;
    blockTypeControl.disabled = false;
    removeButton.disabled = false;
  }
  Object.keys(schedules).forEach(otherZone => {
    const otherTimeline = document.getElementById(schedules[otherZone]["TimelineName"]);
    if (otherTimeline) {
      otherTimeline.querySelectorAll(".timeline-block").forEach(block => {
        block.classList.remove("selected");
      });
    }
  });

  const blocks = schedules[zone][activeDay];
  populateBlockTypeDropdown('block-type',zone);
  document.getElementById("block-type").value = blocks[index].type;
  renderTimeline(zone);

}

function changeBlockType(zone, event) {
  const selectedBlockId = event.target.value;
  const selectedBlock = blockTypes.find(block => block.id === selectedBlockId);

  const temperatureMap = { NIGHT: 15, AWAY: 17, HOME: 20, WARM: 23 };
  const blocks = schedules[zone][activeDay];
  if (selectedBlockIndex !== null) {
    blocks[selectedBlockIndex].type = selectedBlockId;
    blocks[selectedBlockIndex].temperature = selectedBlock.temperature;
    blocks[selectedBlockIndex].command = selectedBlock.command;
    renderTimeline(zone);
  }
}

function updateStartTime(zone, value) {
  const blocks = schedules[zone][activeDay];
  if (selectedBlockIndex !== null) {
    blocks[selectedBlockIndex].startTime = value;
    updateBlockTimes(zone);
    renderTimeline(zone);
  }
}

function updateEndTime(zone, value) {
  const blocks = schedules[zone][activeDay];
  if (selectedBlockIndex !== null) {
    blocks[selectedBlockIndex].endTime = value;
    blocks[selectedBlockIndex + 1].startTime = value;
    updateBlockTimes(zone);
    renderTimeline(zone);
  }
}

function removeBlock(zone) {
  const blocks = schedules[zone][activeDay];
  if (selectedBlockIndex !== null) {
    blocks.splice(selectedBlockIndex, 1);
    selectedBlockIndex = null;
    updateBlockTimes(zone);
    renderTimeline(zone);
  }
}

function updateBlockTimes(zone) {
  const blocks = schedules[zone][activeDay];
  for (let i = 0; i < blocks.length - 1; i++) {
    blocks[i].endTime = blocks[i + 1].startTime;
  }
  blocks[blocks.length - 1].endTime = "24:00";
}

function findMiddleTime(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  const middleTotalMinutes = (startTotalMinutes + endTotalMinutes) / 2;
  const middleHour = Math.floor(middleTotalMinutes / 60).toString().padStart(2, "0");
  const middleMinute = Math.floor(middleTotalMinutes % 60).toString().padStart(2, "0");

  return `${middleHour}:${middleMinute}`;
}

function calculateDuration(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  return endTotalMinutes - startTotalMinutes;
}

function handleDragStart(e, index, zone) {

  // Check if the event is a touch event or a mouse event
  const startEvent = e.touches ? e.touches[0] : e;

  // Set up event listeners for dragging (mousemove/touchmove)
  document.onmousemove = (event) => handleDragging(event, index, zone);
  document.ontouchmove = (event) => handleDragging(event.touches[0], index, zone);

  // Set up event listeners for ending the drag (mouseup/touchend)
  document.onmouseup = handleDragEnd;
  document.ontouchend = handleDragEnd;
}

function handleDragging(e, index, zone) {
  const timeline = document.getElementById(schedules[zone]["TimelineName"]);
  const timelineRect = timeline.getBoundingClientRect();

  // Calculate the x-coordinate for touch or mouse event
  const x = e.clientX - timelineRect.left;
  const percent = x / timelineRect.width;

  // Convert percentage to time in minutes and then to hours/minutes format
  const minutes = Math.round(percent * 1440); // Total minutes in a day (24 * 60)
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");

  const blocks = schedules[zone][activeDay];

  // Only proceed if we're not trying to adjust the last block
  if (index < blocks.length - 1) {
    // Get the previous block's end time in minutes
    const currentBlockEnd = blocks[index+1].endTime.split(":");
    const previousBlockEnd = blocks[index].startTime.split(":");
    const previousEndMinutes = parseInt(previousBlockEnd[0], 10) * 60 + parseInt(previousBlockEnd[1], 10);
    const currentEndMinutes = parseInt(currentBlockEnd[0], 10) * 60 + parseInt(currentBlockEnd[1], 10);

    // Calculate the current block's proposed start time in minutes
    const newStartMinutes = minutes;

    // Check if the new start time is at least 5 minutes after the previous block's end time
    if (newStartMinutes >= previousEndMinutes + 5 && newStartMinutes <= currentEndMinutes - 5) {
      // Update the next block's start time based on the drag position
      blocks[index + 1].startTime = `${hours}:${mins}`;
      updateBlockTimes(zone);
      renderTimeline(zone);
    }
  }
}

function handleDragEnd() {
  // Remove both mouse and touch event listeners when dragging ends
  document.onmousemove = null;
  document.ontouchmove = null;
  document.onmouseup = null;
  document.ontouchend = null;
}

// Function to convert block time to a cron expression
function convertTimeToCron(time, day) {
  const [hour, minute] = time.split(":");
  const daysMap = {
    Monday: "MON",
    Tuesday: "TUE",
    Wednesday: "WED",
    Thursday: "THU",
    Friday: "FRI",
    Saturday: "SAT",
    Sunday: "SUN"
  };
  return `0 ${minute} ${hour} ? * ${daysMap[day]} *`;
}
function convertCronToTime(cronExpression) {
    const [minute, hour] = cronExpression.split(" ");
    const formattedHour = hour.padStart(2, '0');
    const formattedMinute = minute.padStart(2, '0');
    return `${formattedHour}:${formattedMinute}`;
}


// Function to create a rule for each block via openHAB REST API
async function saveBlockAsRule(block, zone, day) {
  if (block.id == 0) { return } // Skip first block
  const zoneData = zones.find(z => z.zoneName === zone);
  const blockData = blockTypes.find((b) => b.id === block.type);
  const cronExpression = convertTimeToCron(block.startTime, day);
  const scriptData = parseAndEvaluate(blockData.script,{blockData, zoneData})
  const ruleData = {
    uid: `schedule_${zone}_${day}_${block.id}`, // Unique identifier
    name: `Heating Schedule for ${zoneData.name}, ${day} - ${blockData.displayName}`,
    description: `${block.type}`,
    tags: ["Schedule", "Heating"],
    triggers: [
      {
        id: "cron_trigger",
        label: "Cron Trigger",
        type: "timer.GenericCronTrigger",
        configuration: {
          cronExpression: cronExpression
        }
      }
    ],
    actions: [
      {
        id: "set_temperature",
        type: "script.ScriptAction",
        configuration: {
          type: "application/vnd.openhab.dsl.rule",
          script: scriptData // Heating_Item.sendCommand(${block.temperature})
        }
      }
    ]
  };

  try {
    const data = await saveRule(ruleData);
  } catch (error) {
    console.error("Failed to create rule:", error);
  }
}
// Function to get all rules for a specific day from openHAB
async function getRulesForDay(zone, day, data) {
    try {
        // Filter for rules that match the day
        const dayRules = data.filter(rule => rule.uid.startsWith(`schedule_${zone}_${day}`));

        // Sort rules by start time if available
        dayRules.sort((a, b) => {
            const timeA = convertCronToTime(a.triggers[0].configuration.cronExpression.split(" ").slice(1, 3).join(" "));
            const timeB = convertCronToTime(b.triggers[0].configuration.cronExpression.split(" ").slice(1, 3).join(" "));
            //console.log(`Time ${timeA} A.`);
            //console.log(`Time ${timeB} B.`);
            return timeA.localeCompare(timeB);
        });

        return dayRules;
    } catch (error) {
        console.error("Failed to fetch rules:", error);
    }
}
async function removeExistingRulesForDay(zone, day) {
    const rules = await getRules();
    const rulesForDay = await getRulesForDay(zone, day, rules);
    console.log(`All rules in ${zone} for ${day} removed.`,rulesForDay);
    for (const rule of rulesForDay) {
        await deleteRule(rule.uid);
    }
    console.log(`All rules in ${zone} for ${day} removed.`);
}



// Function to populate blocks for a given day based on the rules fetched
async function loadScheduleForDay(zone, day, data = null) {
    if (!data) {
      data = await getRules();
    }
    const rules = await getRulesForDay(zone, day, data);
    const blocks = [];
    let firstBlock = [];
    const blocksPreviousDay = schedules[zone][getPreviousDay(day)];
    if(blocksPreviousDay.length == 0)
    {
      firstBlock = {
        id: 0,
        type: 'NIGHT',
        command: "15",
        temperature: '15',
        startTime: "0:00",
        endTime: '24:00'
      }
    }else{
      firstBlock = {
        id: 0,
        type: blocksPreviousDay[blocksPreviousDay.length - 1].type,
        command: blocksPreviousDay[blocksPreviousDay.length - 1].command,
        temperature: blocksPreviousDay[blocksPreviousDay.length - 1].temperature,
        startTime: "0:00",
        endTime: '24:00'
      }
    }

    blocks.push(firstBlock);
    rules.forEach((rule, index) => {
        const cronExpression = rule.triggers[0].configuration.cronExpression;
        const startTime = convertCronToTime(cronExpression.split(" ").slice(1, 3).join(" ")); // Extract HH:MM from cron
        const type = rule.description;
        const selectedBlock = blockTypes.find(block => block.id === type);


        // Determine the end time
        const nextRule = rules[index + 1];
        const endCronExpression = nextRule
            ? nextRule.triggers[0].configuration.cronExpression
            : "0 0 24 * * ?"; // Default to "24:00" for the last block
        const endTime = convertCronToTime(endCronExpression.split(" ").slice(1, 3).join(" "));


        blocks.push({
            id: index+1,
            type: selectedBlock.id, // Helper function to match type
            command: selectedBlock.command,
            temperature: selectedBlock.temperature,
            startTime: startTime,
            endTime: endTime
        });
    });
    if(blocks.length > 1) {

      blocks[0].endTime = blocks[1].startTime
    }

    schedules[zone][day] = blocks;
    renderTimeline(zone);
}

async function loadAllSchedules() {
  const rules = await getRules();
  Object.keys(schedules).forEach(zone => {
    daysOfWeek.forEach(day => {
      loadScheduleForDay(zone, day, rules);
    });
  });

  Object.keys(schedules).forEach(zone => {
    daysOfWeek.forEach(day => {
      loadScheduleForDay(zone, day, rules);
    });
  });
  console.log('Schedules for all zones and days loaded.');
}


async function saveScheduleDay(day) {
  Object.keys(schedules).forEach(zone => saveSchedule(zone,day));
  showNotification(`Schedule for ${day} saved`);
}

async function saveSchedule(zone,day) {
  await removeExistingRulesForDay(zone, day);
  const blocks = schedules[zone][day];
  blocks.forEach(block => saveBlockAsRule(block, zone, day));
}

function createTimeIndicators(elementId) {
  const timeIndicators = document.getElementById(elementId);
  timeIndicators.innerHTML = ""; // Clear existing indicators

  const startHour = 0;
  const endHour = 24;
  const interval = 3; // Interval for visible labels (every 3 hours)

  for (let hour = startHour; hour <= endHour; hour++) {
    const timeIndicator = document.createElement("div");
    timeIndicator.className = "time-indicator";

    // Set the position as a percentage of the timeline width
    const positionPercent = (hour / endHour);
    timeIndicator.style.left = `${positionPercent}%`;

    // Add a label and longer line at the specified interval
    if (hour % interval === 0) {
      const timeLabel = document.createElement("div");
      timeLabel.className = "label";
      timeLabel.innerText = hour.toString().padStart(2, "0") + ":00";
      timeIndicator.appendChild(timeLabel);

      const longLine = document.createElement("div");
      longLine.className = "long-line";
      timeIndicator.appendChild(longLine);
    } else {
      // Short line for other hours
      const shortLine = document.createElement("div");
      shortLine.className = "short-line";
      timeIndicator.appendChild(shortLine);
    }

    timeIndicators.appendChild(timeIndicator);
  }
}

addZoneNames(zoneNames);
// Call this function to generate the indicators when the page loads
document.querySelectorAll('[id^="time-indicators"]').forEach(element => {
  createTimeIndicators(element.id);
});

Object.keys(schedules).forEach(zone => renderTimeline(zone));

console.log(schedules); // Output: "10:00"

const settingsButton = document.getElementById('settings-button');
const modal = document.getElementById('block-settings-modal');
const overlay = document.getElementById('modal-overlay');
const closeModalButton = document.getElementById('close-modal');

// Show the modal
settingsButton.addEventListener('click', () => {
  modal.style.display = 'block';
  overlay.style.display = 'block';
  populateBlockSelect(); // Populate dropdown with zone names
});

// Close the modal
closeModalButton.addEventListener('click', () => {
  modal.style.display = 'none';
  overlay.style.display = 'none';
});

// Close the modal when clicking outside of it
overlay.addEventListener('click', () => {
  modal.style.display = 'none';
  overlay.style.display = 'none';
});

function populateBlockSelect() {
  const blockSelect = document.getElementById('block-select-modal');
  blockSelect.innerHTML = blockTypes.map(block => `<option value="${block.id}">${block.displayName}</option>`).join('');

  // Trigger a change event to load the first zone's script
  blockSelect.dispatchEvent(new Event('change'));
}
const scriptTextarea = document.getElementById('script-textarea-modal');
const saveBlockSettingsButton = document.getElementById('save-block-settings-modal');

// Load the selected zone's script into the editor
document.getElementById('block-select-modal').addEventListener('change', (event) => {
  const selectedZoneId = event.target.value;
  const block = blockTypes.find(z => z.id === selectedZoneId);
  if (block) {
    loadBlockSettings(block)
  }
});

async function saveBlockScriptsToOpenHab() {
  // Collect scripts from blocks
  const blockScripts = blockTypes.map((block) => ({
    id: block.id,
    script: block.script || '',
  }));

  try {
    // Convert the block scripts to JSON format
    const scriptsJSON = JSON.stringify(blockScripts, null, 2);

    await updateItemState("Thermostat_Blocks_Settings", scriptsJSON); // Save script to OpenHab
    console.log(`Block settings saved`);
  } catch (error) {
    console.error(`Failed to save block settings:`, error);
  }
}
async function loadBlockScriptsFromOpenHab() {
  try {
    // Use your existing `getItemState` function to fetch the current OpenHab state
    const scriptsJSON = await getItemState("Thermostat_Blocks_Settings");

    if (!scriptsJSON || scriptsJSON.trim() === "" || scriptsJSON.trim() === "NULL") {
      return; // Exit early if there's no data to process
    }

    // Parse the JSON string to get the array of block scripts
    const blockScripts = JSON.parse(scriptsJSON);

    // Assign scripts to the appropriate blocks
    blockScripts.forEach((block) => {
      const matchingBlock = blockTypes.find((b) => b.id === block.id);
      if (matchingBlock) {
        matchingBlock.script = block.script;
      }
    });

    console.log("Block scripts loaded successfully");
  } catch (error) {
    console.error("Failed to load block scripts:", error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadBlockScriptsFromOpenHab(); // Load existing scripts from OpenHab
});

function populateBlockTypeDropdown(dropdownId, zone) {
  const dropdown = document.getElementById(dropdownId);

  // Clear existing options
  dropdown.innerHTML = '';

  // Find the selected zone's block types
  const zoneData = zones.find(z => z.zoneName === zone);
  if (!zoneData) {
    console.error(`Zone ${zone} not found`);
    return;
  }

  const permittedBlocks = zoneData.blocksAvaiable;

  // Populate options dynamically for permitted blocks
  permittedBlocks.forEach(block => {
    const option = document.createElement('option');
    option.value = block.id;
    option.textContent = block.displayName;

    dropdown.appendChild(option);
  });
}

async function loadBlockSettings(block) {
  try {
    console.log(`Loaded script for zone ${block.displayName}:`, block.script);
    scriptTextarea.value = block.script;
  } catch (error) {
    console.error(`Failed to load settings for zone ${block.displayName}:`, error);
  }
}

async function saveBlockSettings(block, script) {
  try {
    block.script = script
    saveBlockScriptsToOpenHab()

    showNotification(`Settings saved for zone ${block.displayName}`);
  } catch (error) {
    console.error(`Failed to save settings for zone ${block.displayName}:`, error);
  }
}

// Save on script update
saveBlockSettingsButton.addEventListener('click', () => {
  const selectedBlockId = document.getElementById('block-select-modal').value;
  const block = blockTypes.find(z => z.id === selectedBlockId);
  const updatedScript = scriptTextarea.value;
  if (block) {
    saveBlockSettings(block,updatedScript);
  }
});


// Open the modal window
function openCopyModal() {
  document.getElementById('copyModal').style.display = 'block';
}

// Close the modal window
function closeCopyModal() {
  document.getElementById('copyModal').style.display = 'none';
}

// Confirm and perform the copy schedule action
async function confirmCopySchedule() {
  const toDay = document.getElementById('targetDay').value;

  if (activeDay === toDay) {
    showNotification("You cannot copy the schedule to the same day.", "error");
    closeCopyModal();
    return;
  }

  // Perform copy
  Object.keys(schedules).forEach(zone => {
    schedules[zone][toDay] = schedules[zone][activeDay]
  });

  // Save the copied schedule
  await saveScheduleDay(toDay);
  showNotification(`Schedule successfully copied from ${activeDay} to ${toDay}!`);
  closeCopyModal();
}
loadAllSchedules();
selectDay();


window.addBlock = addBlock;
window.removeBlock = removeBlock;
window.selectDay = selectDay;
window.updateStartTime = updateStartTime;
window.updateEndTime = updateEndTime;
window.changeBlockType = changeBlockType;
window.saveScheduleDay = saveScheduleDay;
window.openCopyModal = openCopyModal;
window.closeCopyModal = closeCopyModal;
window.confirmCopySchedule = confirmCopySchedule;
window.activeDay = activeDay;
window.activeZone = activeZone;
