import Discord from "discord.js";
import fetch from 'node-fetch';
import keepAlive from "./server.js";
import dotenv from "dotenv";

function setDailyTimer(callback, hour, minute) {
  const now = new Date();
  const targetTime = new Date(now);

  // Set the desired time for the timer to trigger
  targetTime.setHours(hour);
  targetTime.setMinutes(minute);
  targetTime.setSeconds(0);
  targetTime.setMilliseconds(0);

  // If the target time has already passed for today, set it for tomorrow
  if (targetTime < now) {
    targetTime.setDate(targetTime.getDate() + 1);
  }

  const timeUntilTrigger = targetTime.getTime() - now.getTime();

  setTimeout(() => {
    callback(); 

    // Set the timer to repeat daily
    setInterval(callback, 24 * 60 * 60 * 1000); 
  }, timeUntilTrigger);
}

function unixToDateTime(unixTimestamp) {
  // Create a Date object from the timestamp in milliseconds
  const date = new Date(unixTimestamp * 1000); 

  // Extract date and time components
  // const year = date.getFullYear();
  const month = date.getMonth() + 1; // Months are 0-indexed
  const day = date.getDate();
  // const hours = date.getHours();
  // const minutes = date.getMinutes();
  // const seconds = date.getSeconds();

  // Get the day of the week (0 for Sunday, 1 for Monday, etc.)
  const dayOfWeek = date.getDay();

  // Array of weekday names
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // Get the weekday name
  const weekdayName = weekdays[dayOfWeek];

  // Return a formatted string (customize as needed)
  return `${weekdayName} ${month}/${day}`;
}

function unixToHours(unixTimestamp) {
  // Create a Date object from the timestamp in milliseconds
  const date = new Date(unixTimestamp * 1000); 

  // Get the day of the week (0 for Sunday, 1 for Monday, etc.)
  const dayOfWeek = date.getDay();

  // Array of weekday names
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // Get the weekday name
  const weekdayName = weekdays[dayOfWeek];

  // Extract date and time components
  let hours = date.getHours();
  if (hours < 10) hours = '0' + hours

  // Return a formatted string (customize as needed)
  return `${weekdayName} ${hours}:00`;
}

async function getWeather() {
  const response = await fetch(`https://api.pirateweather.net/forecast/${process.env.API_KEY}/${process.env.LATITUDE},${process.env.LONGITUDE}?&units=us`);
  const data = await response.json();
  return data;
}

// Main function to initialize Discord client
async function init() {
  keepAlive()
  dotenv.config({ path: "./config/config.env" })
  client.login(process.env.DISCORD_TOKEN); // Log in to Discord
}

async function refresh() {
  try {
    const currentTimeET = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
    console.log(currentTimeET, '- data requested');

    const channel = client.channels.cache.get(process.env.CHANNEL_ID); // Replace with discord channel ID
    if (!channel) {
      console.log("Channel not found.");
      return;
    }

    const data = await getWeather()
    const summary = data.daily.summary
    const todayData = data.daily.data[0];

    const {
      time,
      temperatureHigh,
      temperatureLow,
      precipType,
      precipProbability,
      dewPoint,
      humidity,
      windSpeed
    } = todayData || {}; // Fallback to an empty object if player is not found

    let weekly = ''
    let hourly = ''
    for (let i = 0; i < 7; i++){
      weekly += `${unixToDateTime(data.daily.data[i].time)} ${Math.round(data.daily.data[i].temperatureHigh)}/${Math.round(data.daily.data[i].temperatureLow)} ${data.daily.data[i].summary} ${Math.round(100*data.daily.data[i].precipProbability)}% ${data.daily.data[i].precipType}\n`
    }
    for (let i = 0; i < 24; i++){ // 48 max
      let precipType = data.hourly.data[i].precipType
      if (precipType == 'none') precipType = ''
      hourly += `${unixToHours(data.hourly.data[i].time)} ${Math.round(data.hourly.data[i].temperature)}F ${data.hourly.data[i].summary} ${Math.round(100*data.hourly.data[i].precipProbability)}% ${precipType}\n`
    }

    const text = `${weekly}
${hourly}
Dew Point: ${Math.round(dewPoint)}F
Humidity: ${humidity*100}%
Wind Speed: ${windSpeed} mph`
// High/Low: ${Math.round(temperatureHigh)}/${Math.round(temperatureLow)}
// Precipitation: ${precipProbability*100}% ${precipType}
    await channel.send(`\`\`\`${text}\`\`\``);
  } catch (error) {
    console.error(`Error occurred during refresh: ${error}`);
  }
}

// END OF FUNCTIONS

const client = new Discord.Client({ intents: [
  Discord.GatewayIntentBits.Guilds, 
  Discord.GatewayIntentBits.MessageContent, 
  Discord.GatewayIntentBits.GuildMessages] });

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return; // Ignore bot messages

  if (msg.content === "$test") {
    refresh()
  }
});

// pirateweather api 10000 calls/month (around 333/day or 13.8/hr)
init();
setDailyTimer(refresh, 12, 30); // Run refresh daily at 12:30 PM GMT