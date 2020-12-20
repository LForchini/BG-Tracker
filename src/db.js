const { MongoClient } = require("mongodb");
const uri = "mongodb://127.0.0.1:27017";
var collections = {
    null: true,
    users: null,
    achs: null,
    tours: null,
    camps:null
};

function create_client() {
    if (collections.null == true) {
        var client = MongoClient(uri, {useUnifiedTopology: true});
        await client.connect();
        collections.users = client.db(`BG_Bot_${msg.guild.id}`).collection('users');
        collections.achs = client.db(`BG_Bot_${msg.guild.id}`).collection('achievements');
        collections.tours = client.db(`BG_Bot_${msg.guild.id}`).collection('tournaments');
        collections.camps = client.db(`BG_Bot_${msg.guild.id}`).collection('camps');
    }
}

module.exports = {

    /**
     * Adds a user to the database. The first user added will be an admin. If the user already exists in the database, nothing is executed.
     * @param {any} user_data The data to be added to the database
     * @returns {int} Returns a success code
     */
    add_user: (user_data) => {},

    /**
     * Gets a user from the database. The user_id is used to identify the user who's data will be retrieved.
     * @param {any} user_id The user_id of the user who's data will be retrieved
     * @returns {any} All the data the user 
     */
    get_user: (user_id) => {},

    /**
     * Gets all the data of all the users. This is returned in an array.
     * @return {any[]} All the data in the users database
     */
    get_all_users: () => {},

    /**
     * Removes the user specified by the user_id.
     * @param {any} user_id The user_id of the user to be deleted from the database
     * @returns {int} Returns a success code
     */
    remove_user: (user_id) => {},

    /**
     * Makes a user specified by the user_id an admin.
     * @param {any} user_id The user_id of who will become an admin
     * @returns {int} Returns a success code
     */
    make_admin: (user_id) => {},

    /**
     * Checks whether a given user is an admin or not.
     * @param {any} user_id The user_id of the user to check for admin status
     * @returns {boolean} Whether the user is an admin or not
     */
    is_admin: (user_id) => {},

    /**
     * Gives an achievement to the user
     * @param {any} user_id User to award the achievement
     * @param {any} ach_id Achievement to award
     * @returns {int} Returns a success code
     */
    award_achievement: (user_id, ach_id) => {},

    /**
     * Removes an achievement from a user
     * @param {any} user_id User to remove the achievement from
     * @param {any} ach_id Achievement to remove
     * @returns {int} Returns a success code
     */
    deward_achievement: (user_id, ach_id) => {},

    /**
     * Sets the rank of the user.
     * @param {any} user_id User to set the rank of
     * @param {String} rank Rank to set to
     * @returns {int} Returns a success code
     */
    set_rank: (user_id, rank) => {},

    /**
     * Gets the rank of the user.
     * @param {any} user_id User to get the rank of
     * @returns {any} {success: boolean, message: string} which is either a rank or an error message
     */
    get_rank: (user_id) => {},



    /**
     * Adds an achievement to a list which can be awared to users.
     * @param {any} ach_data Data about the achievement
     * @returns {int} Returns a success code
     */
    add_achievement: (ach_data) => {},

    /**
     * Removes an achievement from the list of potential achievements
     * @param {any} ach_id Achievement to be removed
     * @returns {int} Returns a success code
     */
    remove_achievement: (ach_id) => {},

    /**
     * Gets all achievements in a big list
     * @returns {any} List of all achievements
     */
    get_all_achievements: () => {},

    /**
     * Gets the data of a single achievement
     * @param {any} ach_id Achievement to get the data of
     * @returns {any} Data about the achievement
     */
    get_achievement: (ach_id) => {},

    add_tournament: (tour_data) => {},
    remove_tournament: (tour_id) => {},
    open_tournament_sign_ups: (tour_id) => {},
    close_tournament_sign_ups: (tour_id) => {},
    tournament_user_signup: (tour_id, user_id) => {},
    tournament_mentor_signup: (tour_id, user_id) => {},
    get_tournament_users: (tour_id) => {},
    get_tournament_mentors: (tour_id) => {},
    pair_users_and_mentors: (tour_id) => {},
    get_user_mentor_pairings: (tour_id) => {},

    add_camp: (camp_data) => {},
    remove_camp: (camp_id) => {},
    open_camp_sign_ups: (camp_id) => {},
    close_camp_sign_ups: (camp_id) => {},
    camp_user_signup: (camp_id, user_id) => {},
    camp_lecturer_signup: (camp_id, user_id) => {},
    get_camp_users: (camp_id) => {},
    get_camp_lecturers: (camp_id) => {},
    add_camp_lecture: (camp_id, lecture_data) => {},
    get_camp_lecture: (camp_id, lecture_id) => {},
    get_camp_lectures_by_lecturer: (camp_id, user_id) => {}
}