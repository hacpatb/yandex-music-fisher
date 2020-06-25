import md5 from 'blueimp-md5';

const options = {
    headers: {
        'X-Retpath-Y': 'https://music.yandex.ru/'
    },
    redirect: 'error',
    credentials: 'include'
};

function parseJsonResponse(response) {
    if (!response.ok) {
        throw new Error(`${response.status} (${response.statusText})`);
    }
    return response.json();
}

export default class Yandex {

    constructor() {
        this.domain = 'ru'; // ru, ua, kz, by
    }

    get baseUrl() {
        return `https://music.yandex.${this.domain}`;
    }

    async getTrackDownloadInfo(trackId) {
        const trackInfoUrl = `${this.baseUrl}/api/v2.1/handlers/track/${trackId}/track/download/m?hq=1`;
        const trackInfo = await parseJsonResponse(await fetch(trackInfoUrl, options));
        const downloadInfo = await parseJsonResponse(await fetch(`${trackInfo.src}&format=json`));
        const salt = 'XGRlBW9FXlekgbPrRHuSiA';
        const hash = md5(salt + downloadInfo.path.substr(1) + downloadInfo.s);

        return {
            url: `https://${downloadInfo.host}/get-mp3/${hash}/${downloadInfo.ts + downloadInfo.path}`,
            codec: trackInfo.codec // mp3, aac
        };
    }

    getTrack(trackId, albumId) {
        // albumId ставит альбом на первое место в массиве .track.albums
        const url = `${this.baseUrl}/handlers/track.jsx?track=${trackId}%3A${albumId}`;

        return fetch(url, options)
            .then(parseJsonResponse);
    }

    getArtist(artistId) {
        const url = `${this.baseUrl}/handlers/artist.jsx?artist=${artistId}&dir=&what=`;
        return Promise.all([
            fetch(`${url}albums`, options),
            fetch(`${url}tracks`, options)
        ]).then(res => Promise.all([
            parseJsonResponse(res[0]),
            parseJsonResponse(res[1])
        ])).then(res => {
            res[0].tracks = res[1].tracks;
            return res[0];
        });
    }

    getAlbum(albumId) {
        const url = `${this.baseUrl}/handlers/album.jsx?album=${albumId}`;

        return fetch(url, options)
            .then(parseJsonResponse);
    }

    getPlaylist(username, playlistId) {
        const url = `${this.baseUrl}/handlers/playlist.jsx?owner=${username}&kinds=${playlistId}`;

        return fetch(url, options)
            .then(parseJsonResponse)
            .then((json) => json.playlist);
    }

    getLabel(labelId, pageNum) {
        let url = `${this.baseUrl}/handlers/label.jsx?sort=year&id=${labelId}`;
        if (pageNum !== undefined) {
            url += `&page=${pageNum}`;
        }

        return fetch(url, options)
            .then(parseJsonResponse);
    }
}
