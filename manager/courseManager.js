const { EmbedBuilder } = require('discord.js');
const wget = require('node-wget');
const fs = require('fs');
const ical = require('node-ical');
const schedule = require('node-schedule');

const client = require('../utils/client');
const { log } = require('console');

const projectId = 8;
const ressource = 171130;
const firstDate = formatDate(new Date());
const date7 = new Date();
date7.setDate(date7.getDate() + 7);
const lastDate = formatDate(date7);

const url = `https://ade-web-consult.univ-amu.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?projectId=${projectId}&resources=${ressource}&calType=ical&firstDate=${firstDate}&lastDate=${lastDate}`;

const nextCourse = { 1:null, 2:null, 3:null, 4:null };
let courses = [];

class Course {
	constructor(uid, summary, description, location, start, end) {
		this.uid = uid;
		this.summary = summary;
		this.description = description;
		this.location = location;
		this.start = new Date(start);
		this.end = new Date(end);
	}
}

function formatDate(date) {
	let d = new Date(date),
		month = '' + (d.getMonth() + 1),
		day = '' + d.getDate(),
		year = d.getFullYear();

	if (month.length < 2) {month = '0' + month;}
	if (day.length < 2) {day = '0' + day;}
	return [year, month, day].join('-');
}

function setupCourses() {
	courses = [];
	if (fs.existsSync(process.cwd() + '/data/anonymous_cal.jsp')) {
		const events = ical.sync.parseFile(process.cwd() + '/data/anonymous_cal.jsp');
		for (const event of Object.values(events)) {
			if (event.type != 'VEVENT') continue;
			if (new Date(event.start) < Date.now()) continue;
			const course = new Course(event.uid, event.summary, event.description, event.location, event.start, event.end);
			courses.push(course);
		}
		courses.sort((a, b) => a.start - b.start);
		return;
	}
}


function downloadIcs() {
	console.log('Downloading Ics');
	wget({
		url: url,
		dest: './data/',
		timeout: 2000,
	}, (error) => {
		if (error) {
			console.log('--- error:');
			console.log(error);
		}
	});
	setupCourses();
}

function setupDailyJobs() {
	schedule.scheduleJob('0 1 * * *', () => {
		downloadIcs();
	});
	schedule.scheduleJob('0 18 * * *', () => {
		// check tomorrow courses and send message for each group
		const embeds = [];
		for (let i = 1; i <= 4; i++) {
			const course = getNextCourseForGroup(i);
			if (course == null) continue;
			embeds.push(buildEmbedForCourse(course, i));
		}
		if (embeds.length == 0) return;
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		client.Client.channels.fetch(process.env.CHANNEL_ID).then(chan => chan.send({ content:`***Voici les premiers cours du ${tomorrow.getMonth()}/${tomorrow.getDate()}***`, embeds: embeds })).catch(console.error);
	});

	schedule.scheduleJob('*/5 * * * * *', () => {
		setupCourses();
		const embeds = [];
		for (let i = 1; i <= 4; i++) {
			const course = getNextCourseForGroup(i);
			// check if course is null and nextCourse is not course and if it start in less tha 15 min
			if (course == null || nextCourse[i] == course || course.start - Date.now() > 900000) continue;
			nextCourse[i] = course;
			embeds.push(buildEmbedForCourse(course, i));
		}
		if (embeds.length == 0) return;
		client.Client.channels.fetch(process.env.CHANNEL_ID).then(chan => chan.send({ embeds: embeds })).catch(console.error);
	});
}

function getCurrentCourseForGroup(group) {
	const now = Date.now();
	for (const course of courses) {
		if (course.start < now && course.end > now && course.summary.includes('Gpe ' + group)) {
			return course;
		}
	}
	return null;
}

function getNextCourseForGroup(group) {
	const now = Date.now();
	for (const course of courses) {
		if (course.start > now && course.summary.includes('Gpe ' + group)) {
			return course;
		}
	}
	return null;
}

function buildEmbedForCourse(course, group) {
	const remainingTime = getTimeRemaining(course.start);
	return new EmbedBuilder().setTitle('Prochain cours').setDescription(`Prochain cours pour le Groupe ${group}`).addFields(
		{ name: 'Sommaire', value: course.summary },
		{ name: 'Localisation', value: course.location },
		{ name: 'Start At', value: course.start.toString() },
		{ name: 'Temps restant avant le cours', value: `${remainingTime.days} Jours, ${remainingTime.hours} Heures, ${remainingTime.minutes} Minutes` },

	);
}

function getTimeRemaining(endtime) {
	const total = Date.parse(endtime) - Date.parse(new Date());
	const seconds = Math.floor((total / 1000) % 60);
	const minutes = Math.floor((total / 1000 / 60) % 60);
	const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
	const days = Math.floor(total / (1000 * 60 * 60 * 24));

	return {
		total,
		days,
		hours,
		minutes,
		seconds,
	};
}

module.exports = {
	downloadIcs: downloadIcs(),
	setup: () => {
		setupDailyJobs();
	},
	courses,
	getCurrentCourseForGroup,
	getNextCourseForGroup,
	buildEmbedForCourse,
};