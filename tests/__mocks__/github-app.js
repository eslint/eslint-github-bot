/*
 * We have to mock this dependecny as its not worth the effort to solve all the things
 * related to private keys and request header cert.
 */
module.exports = () => ({
    createToken: () => Promise.resolve({
        data: {
            token: "test"
        }
    })
});
