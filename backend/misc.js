const EventsHandler = require('./eventsDatabase');
const { MessageEmbed } = require('discord.js');
const moment = require('moment');

const event_regex = /Events \(page (?<page_string>\d+|NaN)\/\d+\)/


function getPageFromEventsList(message) {
    // Get page from embed title
    const { page_string } = event_regex.exec(
        message.embeds[0].title
    ).groups

    if (isNaN(parseInt(page_string))) {
        return 0
    }
    else {
        return parseInt(page_string) - 1;
    }
}


function parseDate(date_string, recurring) {
    // null date_string is valid
    if (date_string == null) return { valid: true, date: null }

    const now = new Date();
    
    // Parse date
    const date_format = "YYYY/MM/DD kk:mm";
    const date        = moment(date_string, date_format);

    console.log(date_string)
    
    // Checks if a date is valid and returns an appropriate error
    // message if not

    if (isNaN(date)) {
        // Check if the date is valid
        return {
            valid: false,
            error: `The provided date: \`${date_string}\` is invalid. Please try again`,
        };
    }

    if (date < now) {
        // Check if the date is in the past
        return {
            valid: false,
            error: `The provided date: \`${date_string}\` is in the past. Please try again`,
        }
    }

    // Check if event is recurring monthly and if so, its day of the month
    // is less than 28
    if (recurring == "monthly" && date.date() > 28) {
        return {
            valid: false,
            error: "You cannot schedule a monthly event for later than the 28th of the month",
        }
    }

    return { valid: true, date: date };
}


async function generateEventsList(guild, page) {
    // Get all events
    const events_handler = new EventsHandler();
    const scheduled_events = await events_handler.getAllEvents(guild)

    const max_pages = Math.ceil(scheduled_events.length / 5);

    console.log(max_pages == 0)

    // If max_pages == 0 then page % max_pages == NaN
    // If there are no events, we want to say page 0/0
    page = max_pages > 0 ? Math.abs(page % max_pages) : -1

    // init embed
    const embed = new MessageEmbed()
        .setTitle(`Events (page ${page + 1}/${max_pages})`);

    for (event_entry of scheduled_events.slice(page * 5, page + 1 * 5)) {
        // Loop over events and add them to the embed

        // Get party
        const party_list = await events_handler.getParty(event_entry.event_id);

        // Get display names
        const display_names = []
        for (user_id of party_list) {
            const member = await guild.members.fetch(user_id);
            display_names.push(member.displayName);
        }

        // Party count
        const party_count = display_names.length

        // Check if names are empty
        if (!display_names.length) {
            display_names.push("Nobody");
        }

        // Set the appropriate date format
        const date_format = 
            event_entry.recurring == "weekly" ? (
                "dddd[s at] kk:mm"
            )
            : event_entry.recurring == "monthly" ? (
                        "[The] Do [of every month at] kk:mm"
            )
            : "MMM Do [at] kk:mm"

        const date_string = moment(event_entry.date).format(date_format);


        // Update embed
        embed.addFields(
            {
                name: `${event_entry.name} (${date_string})`, 
                value: event_entry.description, 
                inline: true
            },
            {
                name: `Party (${party_count})`,
                value: display_names.join("\n"),
                inline: true
            },
            {
                name: "⠀",
                value: "⠀",
                inline: false
            }
        );
    }

    return embed
}

module.exports = { generateEventsList, getPageFromEventsList, parseDate };
