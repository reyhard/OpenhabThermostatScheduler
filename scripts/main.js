import { saveRule, deleteRule, getRules } from './api.js';

let schedules = {

  Zone1: { TimelineName: "timeline1", Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] },
  Zone2: { TimelineName: "timeline2", Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] },
  Zone3: { TimelineName: "timeline3", Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] },
  Zone4: { TimelineName: "timeline4", Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] },
  Zone5: { TimelineName: "timeline5", Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] },
};
const zoneNames = ['Generalna', 'Kuchnia', 'Salon', 'Sypialnia', 'Łazienka'];

let activeDay = 'Monday';
let activeZone = 'Zone1';
let selectedBlockIndex = null; // Track selected block index

function selectDay(day) {
  activeDay = day;
  window.activeDay = activeDay;
  document.querySelectorAll(".day-button").forEach(button => button.classList.remove("active"));
  document.querySelector(`button[onclick="selectDay('${day}')"]`).classList.add("active");

  selectedBlockIndex = null; // Reset selected block when switching days
  Object.keys(schedules).forEach(zone => {
    loadScheduleForDay(zone, day);
  });
}

function switchZone(zone) {
  activeZone = zone;
  renderTimeline(zone); // Re-render the timeline for the selected zone
}

function addBlock(zone, day) {
  const blocks = schedules[zone][day];
  if (blocks.length >= 6) {
    alert("You can only add up to 6 blocks.");
    return;
  }

  const block = {
    id: blocks.length,
    type: "NIGHT",
    temperature: 15,
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
    const blockDiv = document.createElement("div");
    blockDiv.className = `timeline-block ${getBlockColorClass(block.temperature)}`;
    blockDiv.innerText = `${block.type} ${block.startTime}`;

    blockDiv.onclick = () => selectBlock(zone, index);

    const durationInMinutes = calculateDuration(block.startTime, block.endTime);
    blockDiv.style.width = `${(durationInMinutes / 1440) * 100}%`;

    if (index < blocks.length - 1) {
      const handleDiv = document.createElement("div");
      handleDiv.className = "drag-handle";
      handleDiv.onmousedown = (e) => handleDragStart(e, index);
      // Touch event for dragging on touchscreen
      handleDiv.ontouchstart = (e) => {
        e.preventDefault(); // Prevent scrolling during touch
        handleDragStart(e.touches[0], index);
      };
      blockDiv.appendChild(handleDiv);
    }

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

function getBlockColorClass(temperature) {
  if (temperature > 22) return "temp-high";
  if (temperature >= 20) return "temp-normal";
  if (temperature < 16) return "temp-low";
  return "temp-medium";
}

function selectBlock(zone, index) {
  selectedBlockIndex = index;
  activeZone = zone;
  window.activeZone = activeZone;

  Object.keys(schedules).forEach(otherZone => {
    const otherTimeline = document.getElementById(schedules[otherZone]["TimelineName"]);
    if (otherTimeline) {
      otherTimeline.querySelectorAll(".timeline-block").forEach(block => {
        block.classList.remove("selected");
      });
    }
  });

  const blocks = schedules[zone][activeDay];
  document.getElementById("block-type").value = blocks[index].type;
  renderTimeline(zone);
}

function changeBlockType(zone, event) {
  const type = event.target.value;
  const temperatureMap = { NIGHT: 15, AWAY: 17, HOME: 20, WARM: 23 };
  const blocks = schedules[zone][activeDay];
  if (selectedBlockIndex !== null) {
    blocks[selectedBlockIndex].type = type;
    blocks[selectedBlockIndex].temperature = temperatureMap[type];
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
function handleDragStart(e, index) {

  // Check if the event is a touch event or a mouse event
  const startEvent = e.touches ? e.touches[0] : e;

  // Set up event listeners for dragging (mousemove/touchmove)
  document.onmousemove = (event) => handleDragging(event, index);
  document.ontouchmove = (event) => handleDragging(event.touches[0], index);

  // Set up event listeners for ending the drag (mouseup/touchend)
  document.onmouseup = handleDragEnd;
  document.ontouchend = handleDragEnd;
}
function handleDragging(e, index) {
  const timeline = document.getElementById("timeline");
  const timelineRect = timeline.getBoundingClientRect();

  // Calculate the x-coordinate for touch or mouse event
  const x = e.clientX - timelineRect.left;
  const percent = x / timelineRect.width;

  // Convert percentage to time in minutes and then to hours/minutes format
  const minutes = Math.round(percent * 1440); // Total minutes in a day (24 * 60)
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");

  const blocks = schedules[activeZone][activeDay];

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
      updateBlockTimes(activeZone);
      renderTimeline(activeZone);
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
  const cronExpression = convertTimeToCron(block.startTime, day);
  const ruleData = {
    uid: `schedule_${zone}_${day}_${block.id}`, // Unique identifier
    name: `Heating Schedule for ${day} at ${block.temperature}°C`,
    description: `${block.temperature}°C`,
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
          script: `` // Heating_Item.sendCommand(${block.temperature})
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
async function getRulesForDay(zone, day) {
    try {
        const data = await getRules();

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
    const rulesForDay = await getRulesForDay(zone, day);
    console.log(`All rules in ${zone} for ${day} removed.`,rulesForDay);
    for (const rule of rulesForDay) {
        await deleteRule(rule.uid);
    }
    console.log(`All rules in ${zone} for ${day} removed.`);
}



// Function to populate blocks for a given day based on the rules fetched
async function loadScheduleForDay(zone, day) {
    const rules = await getRulesForDay(zone, day);
    const blocks = [];

    blocks.push({
            id: 0,
            type: 'NIGHT', // Helper function to match type
            temperature: '15',
            startTime: "0:00",
            endTime: '24:00'
        });
    rules.forEach((rule, index) => {
        const cronExpression = rule.triggers[0].configuration.cronExpression;
        const startTime = convertCronToTime(cronExpression.split(" ").slice(1, 3).join(" ")); // Extract HH:MM from cron
        const temperature = rule.description.match(/(\d+)\s*°C/)[1];

        // Determine the end time
        const nextRule = rules[index + 1];
        const endCronExpression = nextRule
            ? nextRule.triggers[0].configuration.cronExpression
            : "0 0 24 * * ?"; // Default to "24:00" for the last block
        const endTime = convertCronToTime(endCronExpression.split(" ").slice(1, 3).join(" "));


        blocks.push({
            id: index+1,
            type: getTypeFromTemperature(temperature), // Helper function to match type
            temperature: parseInt(temperature, 10),
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
// Helper function to get block type based on temperature
function getTypeFromTemperature(temp) {
    if (temp == 15) return "NIGHT";
    if (temp == 17) return "AWAY";
    if (temp == 20) return "HOME";
    if (temp == 23) return "WARM";
    return "WARM";
}

async function saveScheduleDay() {
  Object.keys(schedules).forEach(zone => saveSchedule(zone));
  alert(`Schedule for ${activeDay} saved!`);
}

async function saveSchedule(zone) {
  await removeExistingRulesForDay(zone, activeDay);
  const blocks = schedules[zone][activeDay];
  blocks.forEach(block => saveBlockAsRule(block, zone, activeDay));
}
// Sample usage to save all blocks in a schedule as rules
function saveAllBlocksAsRules() {
  for (const [day, blocks] of Object.entries(schedules)) {
    blocks.forEach(block => saveBlockAsRule(block, zone, day));
  }
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
selectDay('Monday');
// Call this function to generate the indicators when the page loads
document.querySelectorAll('[id^="time-indicators"]').forEach(element => {
  createTimeIndicators(element.id);
});
Object.keys(schedules).forEach(zone => renderTimeline(zone));

console.log(schedules); // Output: "10:00"


window.addBlock = addBlock;
window.removeBlock = removeBlock;
window.selectDay = selectDay;
window.updateStartTime = updateStartTime;
window.updateEndTime = updateEndTime;
window.changeBlockType = changeBlockType;
window.saveScheduleDay = saveScheduleDay;
window.activeDay = activeDay;
window.activeZone = activeZone;
