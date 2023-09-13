const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const htmlTable = require('table-builder');
const htmlToImg = require('node-html-to-image');
const courseManager = require('../../manager/courseManager');
const TableBuilder = require('table-builder');
const nodeHtmlToImage = require('node-html-to-image');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ade')
		.setDescription('Show next ade!')
		.addSubcommand(subcommand =>
			subcommand
				.setName('table')
				.setDescription('Affiche un edt en ascii')
				.addStringOption(option =>
					option.setName('group')
						.setDescription('Groupe Number')
						.setRequired(true)
						.addChoices(
							{ name: 'Groupe 1', value: '1' },
							{ name: 'Groupe 2', value: '2' },
							{ name: 'Groupe 3', value: '3' },
							{ name: 'Groupe 4', value: '4' },
						),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('next')
				.setDescription('Affiche le prochain cours')

				.addStringOption(option =>
					option.setName('group')
						.setDescription('Groupe Number')
						.setRequired(true)
						.addChoices(
							{ name: 'Groupe 1', value: '1' },
							{ name: 'Groupe 2', value: '2' },
							{ name: 'Groupe 3', value: '3' },
							{ name: 'Groupe 4', value: '4' },
						),
				),
		),
	async execute(interaction) {
		// setup after downloading Ics
		if (interaction.options.getSubcommand() === 'next') {

			const group = interaction.options.getString('group');
			const nextCourse = courseManager.getNextCourseForGroup(group);
			const courseEmbed = courseManager.buildEmbedForCourse(nextCourse, group);
			await interaction.reply({ embeds: [courseEmbed] });
		}
		else if (interaction.options.getSubcommand() === 'table') {
			const group = interaction.options.getString('group');
			const courses = courseManager.courses.filter((course) => course.summary.includes('Gpe ' + group));
			const data = {
				lundi:  [],
				mardi: [],
				mercredi: [],
				jeudi: [],
				vendredi: [],
			};

			courses.forEach(course => {
				switch (course.start.getDay()) {
				case 1:
					data.lundi.push(formatAsTableCase(course));
					break;
				case 2:
					data.mardi.push(formatAsTableCase(course));
					break;
				case 3:
					data.mercredi.push(formatAsTableCase(course));
					break;
				case 4:
					data.jeudi.push(formatAsTableCase(course));
					break;
				case 5:
					data.vendredi.push(formatAsTableCase(course));
					break;

				default:
					break;
				}
			});
			const table = new TableBuilder({ 'class': 'some-table' });
			table.setHeaders({ summary: 'Sommaire', loc: 'Localisation', start: 'Start At'});
			table.setData(data.lundi);

			nodeHtmlToImage({
				output: process.cwd() + '/data/table.png',
				html: table.render(),
			});
			await interaction.reply(table.render());
		}
	},
};

function formatAsTableCase(course) {
	return { summary: course.summary, loc: course.location, start: course.start };
	// return `${course.summary}\noù ${course.location}\nà ${course.start}`;
}
