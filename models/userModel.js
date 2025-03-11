const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        user_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        full_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        display_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: {
                args: true,
                msg: "Username already in use!",
            },
        },
        is_login: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: {
                args: true,
                msg: "Email address already in use!",
            },
        },
        mobile: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: {
                args: true,
                msg: "Mobile already in use!",
            },
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_email_verified: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        is_mobile_verified: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        is_kyc_done: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        gender: {
            type: DataTypes.ENUM,
            allowNull: true,
            values: ["Male", "Female"],
        },
        dob: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        profile_image: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        email_verify_token: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        device_type: {
            type: DataTypes.ENUM,
            allowNull: true,
            values: ["IOS", "Android"],
        },
        device_token: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        device_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        number_of_win_games: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
        number_of_win_tournament: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
        amount_win_in_game: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
        amount_win_in_tournament: {
            type: DataTypes.DECIMAL,
            allowNull: true,
            defaultValue: 0,
        },
        total_amount_won: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        referral_code: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        friend_refer_code: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        last_login: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        socket_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_bot: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['0','1'],
            defaultValue: '0',
        },
        otp: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        check_resend_otp_count_register: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        check_resend_otp_count_login: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        check_resend_otp_count: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        resend_otp_time_for_register: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        resend_otp_time_for_login: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        resend_otp_time: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        commission: {
            type: DataTypes.DECIMAL,
            allowNull: true
        },
        ip: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        token: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        user_status: {
            type: DataTypes.ENUM,
            allowNull: true,
            values: ["0", "1", "2"],
            defaultValue: '1'
        },
        user_level: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: JSON.stringify({ VPIP: 0, PFR: 0, threeBet: 0, foldToThreeBet: 0, cBet: 0, foldToCBet: 0, steal: 0, checkRaise: 0, handsPlayed: 0 })
        },
        is_influencer: {
            type: DataTypes.ENUM,
            allowNull: true,
            values: ["0", "1"],
            defaultValue: "0"
        },
        is_agent: {
            type: DataTypes.ENUM,
            allowNull: true,
            values: ["0", "1"],
            defaultValue: "0"
        },
        is_ludo_bot:{
            type: DataTypes.BOOLEAN,
            defaultValue:false
          },

        is_pool_bot: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['0','1'],
            defaultValue: '0',
        },
          inGame:{
            type:DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull:false
            
          },
          avatarId: {
            type: DataTypes.INTEGER,
            allowNull: true,
           // defaultValue: 1
        },
        gmailUserId: {
          type: DataTypes.STRING,
          allowNull: true
      },
      isFirstTime:{
        type:DataTypes.INTEGER,
        allowNull: false,
        defaultValue:1
      },
        app_version: {
            type: DataTypes.STRING,
            allowNull: true
        },
        isAdmin: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        added_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },

    };

    return sequelize.define('users', attributes, { timestamps: true });
}
