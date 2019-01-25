function randomId() {
    return Math
        .floor(Math.random() * 2116316160 + 60466176)
        .toString(36);
}
export default randomId;