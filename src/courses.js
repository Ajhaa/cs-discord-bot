const { getRoleFromCategory } = require("./util");
const updateGuide = require("./updateGuide");

const createCategoryName = (courseString) => `📚 ${courseString}`;

/**
 *
 * @param {String} name
 * @param {Discord.Guild} guild
 */
const findOrCreateRoleWithName = async (name, guild) => {
  return (
    guild.roles.cache.find((role) => role.name === name) ||
    (await guild.roles.create({
      data: {
        name,
      },
    }))
  );
};

/**
 *
 * @param {Object} channelObject
 * @param {Discord.Guild} guild
 * @param {Discord.GuildChannel} parent
 */
const findOrCreateChannel = (channelObject, guild) => {
  const { name, options } = channelObject;
  const alreadyExists = guild.channels.cache.find(
    (c) => c.type === options.type && c.name === name
  );
  if (alreadyExists) return alreadyExists;
  return guild.channels.create(name, options);
};

/**
 *
 * @param {String} courseName
 * @param {String} roleName
 * @param {Discord.Role} studentRole
 * @param {Discord.Role} adminRole
 * @param {Discord.Guild} guild
 */
const findOrCreateCategoryWithName = async (
  courseName,
  roleName,
  studentRole,
  adminRole,
  guild
) => {
  const categoryName = createCategoryName(courseName, roleName);
  const permissionOverwrites = [
    {
      id: guild.id,
      deny: ["VIEW_CHANNEL"],
    },
    {
      id: adminRole.id,
      allow: ["VIEW_CHANNEL"],
    },
    {
      id: studentRole.id,
      allow: ["VIEW_CHANNEL"],
    },
  ];

  const categoryObject = {
    name: categoryName,
    options: {
      type: "category",
      permissionOverwrites,
    },
  };

  return findOrCreateChannel(categoryObject, guild);
};

/**
 *
 * @param {Discord.GuildMember} user
 * @param {String} courseName
 * @param {Discord.Guild} guild
 */
const createCourse = async (user, courseString, guild) => {
  if (user.roles.highest.name !== "admin") return;
  const roleName = getRoleFromCategory(courseString);

  const studentRole = await findOrCreateRoleWithName(roleName, guild);
  const adminRole = await findOrCreateRoleWithName(`${roleName} admin`, guild);

  const category = await findOrCreateCategoryWithName(
    courseString,
    roleName,
    studentRole,
    adminRole,
    guild
  );

  const CHANNELS = [
    {
      name: `${roleName}_announcement`,
      options: {
        type: "text",
        description: 'Messages from course admins',
        parent: category,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: ["VIEW_CHANNEL"],
          },
          {
            id: studentRole,
            deny: ["SEND_MESSAGES"],
            allow: ["VIEW_CHANNEL"],
          },
          {
            id: adminRole,
            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"],
          },
        ],
      },
    },
    {
      name: `${roleName}_general`,
      parent: category,
      options: { type: "text", parent: category, permissionOverwrites: [] },
    },
    {
      name: `${roleName}_questions`,
      parent: category,
      options: { type: "text", parent: category, permissionOverwrites: [] },
    },
    {
      name: `${roleName}_voice`,
      parent: category,
      options: { type: "voice", parent: category, permissionOverwrites: [] },
    },
  ];

  await CHANNELS.reduce(async (promise, channel) => {
    await promise;

    return findOrCreateChannel(channel, guild);
  }, Promise.resolve());

  updateGuide(guild);
};

module.exports = {
  createCourse,
};
