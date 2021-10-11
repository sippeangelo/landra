const EventsHandler = require('../backend/eventsDatabase');
const { parseDate } = require('../backend/misc');

module.exports = {
	name: 'update_event_menu',

    async execute(interaction) {
        await interaction.deferUpdate()
        // Init
        const events_handler = new EventsHandler();

        const embed_fields = interaction.message.embeds[0].fields;
        const event_id = interaction.values[0];
        const event = await events_handler.getEvent(event_id);
        const time_offset = await events_handler.getPrintableOffset(interaction.guild);
        
        // Get the relevant fields
        const name               = embed_fields.filter(field => field.name == "New name").map(field => field.value);
        const date_string        = embed_fields.filter(field => field.name == "New date").map(field => field.value);
        const description        = embed_fields.filter(field => field.name == "New description").map(field => field.value);
        let   recurring_string   = embed_fields.filter(field => field.name == "Recurring").map(field => field.value);

        // Init update data
        const update_data = {}

        // If there is no recurring string, get it from the event
        // Else process it as normal
        if (recurring_string.length == 0) {
            recurring = event.recurring;
        }
        else {
            recurring = recurring_string[0] == "once" ? null : recurring_string[0]
        }

        // Check if date is being updated and parse it
        const date_status = date_string.length == 0 
            ? parseDate(event.date, recurring) 
            : parseDate(date_string[0] + time_offset, recurring);

        if (!date_status.valid) {
            await interaction.editReply({
                content: date_status.error,
                components: [],
                embeds: []
            })

            return
        }

        // Set date since it is ok
        const date = date_status.date.toDate();

        // Set the required attributes of update_data
        if (name.length > 0)          update_data.name        = name[0];
        if (description.length > 0)   update_data.description = description[0];
        if (date_string.length > 0)   update_data.date        = date;
                                      update_data.recurring   = recurring;

        // Update the event
        await events_handler.updateEvent(event_id, update_data);

        // Update join list
        await interaction.editReply({
            content: "Event updated. Refresh the events list to see the changes.",
            components: [],
            embeds: []
        })
	},
};
