const appConfig = {
    sos: {
        boothName: "Zilla Parishad High School Guntur",
        boothDisplay: "Zilla Parishad School (Guntur West)",
        helpline: "1950",
        mapUrl: "https://www.google.com/maps/dir/?api=1&destination=Zilla+Parishad+High+School+Guntur"
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100
    },
    cache: {
        voterTTL: 600,
        staticMaxAge: "1d"
    }
};

module.exports = appConfig;
