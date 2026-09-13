/**
 * RevenueLab - Hospitality Presence Map
 * Leaflet 1.9.4 must be loaded before this script (via js/leaflet.js)
 */

(function () {
    'use strict';

    var MAX_RETRIES = 20;
    var retryCount  = 0;

    function initMap() {
        var mapContainer = document.getElementById('leaflet-presence-map');
        if (!mapContainer) { return; }

        // Check if Leaflet global is ready
        if (typeof window.L === 'undefined' || typeof window.L.map !== 'function') {
            retryCount++;
            if (retryCount <= MAX_RETRIES) {
                setTimeout(initMap, 200);
            } else {
                console.error('[RevenueLab Map] Leaflet failed to load after ' + MAX_RETRIES + ' retries.');
            }
            return;
        }

        var L = window.L;

        // Destroy previous Leaflet instance (supports Live-Server hot-reload)
        if (window._hospitalityMap) {
            try { window._hospitalityMap.remove(); } catch (e) {}
            window._hospitalityMap = null;
        }
        if (mapContainer._leaflet_id) {
            try { delete mapContainer._leaflet_id; } catch (e) {}
        }

        // ── Create Map ──────────────────────────────────────────────────────────
        var map = L.map('leaflet-presence-map', {
            scrollWheelZoom: false,
            zoomControl: true,
            trackResize: true
        }).setView([20.0, 10.0], 2);

        window._hospitalityMap = map;

        // ── Tile Layer: Esri (no referrer restriction, works on file:// & localhost) ─
        L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
            {
                maxZoom: 19,
                attribution: 'Tiles &copy; Esri'
            }
        ).addTo(map);

        // ── Hotel Locations ──────────────────────────────────────────────────────
        var locations = [
            { name: "RevenueLab Global HQ",                city: "Marietta, GA",      region: "USA",       coords: [33.9526, -84.5499],  keys: "Strategy HQ", type: "Global HQ" },
            { name: "Atlanta Marriott Perimeter Center",   city: "Atlanta, GA",       region: "USA",       coords: [33.9238, -84.3414],  keys: "396 Keys",    type: "Full Service Hotel" },
            { name: "Hilton Garden Inn Marietta",          city: "Marietta, GA",      region: "USA",       coords: [33.9426, -84.5599],  keys: "140 Keys",    type: "Select Service" },
            { name: "Holiday Inn Express Atlanta",         city: "Atlanta, GA",       region: "USA",       coords: [33.7590, -84.3880],  keys: "170 Keys",    type: "Select Service" },
            { name: "Coastal Boutique Resort Savannah",   city: "Savannah, GA",      region: "USA",       coords: [32.0809, -81.0912],  keys: "65 Keys",     type: "Boutique Resort" },
            { name: "Hyatt Place Nashville Downtown",      city: "Nashville, TN",     region: "USA",       coords: [36.1627, -86.7816],  keys: "255 Keys",    type: "Select Service" },
            { name: "Courtyard by Marriott Orlando",       city: "Orlando, FL",       region: "USA",       coords: [28.5383, -81.3792],  keys: "210 Keys",    type: "Franchised Hotel" },
            { name: "Dallas Market Center Hotel",          city: "Dallas, TX",        region: "USA",       coords: [32.7767, -96.7970],  keys: "185 Keys",    type: "Commercial Property" },
            { name: "Denver Tech Center Inn",              city: "Denver, CO",        region: "USA",       coords: [39.7392, -104.9903], keys: "130 Keys",    type: "Select Service" },
            { name: "California Coast Boutique Resort",   city: "Santa Barbara, CA", region: "USA",       coords: [34.4208, -119.6982], keys: "85 Keys",     type: "Luxury Boutique" },
            { name: "Mumbai Business Bay Hotel",           city: "Mumbai, MH",        region: "India",     coords: [19.0760,  72.8777],  keys: "220 Keys",    type: "Commercial Business Hotel" },
            { name: "Pune Tech Corridor Inn",              city: "Pune, MH",          region: "India",     coords: [18.5204,  73.8567],  keys: "110 Keys",    type: "Select Service" },
            { name: "Sydney Harbour View Suites",          city: "Sydney, NSW",       region: "Australia", coords: [-33.8688, 151.2093], keys: "145 Keys",    type: "Boutique Luxury Suites" },
            { name: "Melbourne CBD Commercial Hotel",      city: "Melbourne, VIC",    region: "Australia", coords: [-37.8136, 144.9631], keys: "190 Keys",    type: "Franchised Business Hotel" }
        ];

        // ── Custom Pin Icon ──────────────────────────────────────────────────────
        var pin = L.divIcon({
            className: 'custom-map-pin',
            html: '<div style="background:#059669;width:22px;height:22px;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 12px rgba(5,150,105,.6);"></div>',
            iconSize:   [22, 22],
            iconAnchor: [11, 11]
        });

        // ── Add Markers ──────────────────────────────────────────────────────────
        var markers = [];
        locations.forEach(function (loc) {
            var m = L.marker(loc.coords, { icon: pin }).addTo(map);
            m._region = loc.region;
            m.bindPopup(
                '<div style="padding:10px;font-family:sans-serif;">' +
                '<span style="background:#ECFDF5;color:#059669;font-size:10px;font-weight:800;padding:2px 8px;border-radius:9999px;text-transform:uppercase;display:inline-block;margin-bottom:6px;">' + loc.region + ' Portfolio</span>' +
                '<h4 style="font-size:13px;font-weight:800;color:#0F172A;margin:0 0 4px;">' + loc.name + '</h4>' +
                '<p style="font-size:11px;color:#64748B;margin:0 0 6px;">' + loc.city + ' &bull; ' + loc.keys + '</p>' +
                '<span style="font-size:10px;font-weight:700;color:#B08D48;">' + loc.type + '</span>' +
                '</div>'
            );
            markers.push(m);
        });

        // ── Fix tile rendering after layout ─────────────────────────────────────
        [200, 600, 1500, 3000].forEach(function (ms) {
            setTimeout(function () { map.invalidateSize(); }, ms);
        });

        window.addEventListener('resize', function () { map.invalidateSize(); });
        window.addEventListener('scroll', function () {
            var r = mapContainer.getBoundingClientRect();
            if (r.top < window.innerHeight && r.bottom > 0) { map.invalidateSize(); }
        });
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                entries.forEach(function (e) { if (e.isIntersecting) { map.invalidateSize(); } });
            }, { threshold: 0.05 }).observe(mapContainer);
        }

        // ── Region Filter ────────────────────────────────────────────────────────
        document.querySelectorAll('.map-filter-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.map-filter-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var region = btn.getAttribute('data-region');
                markers.forEach(function (m) {
                    region === 'all' || m._region === region ? map.addLayer(m) : map.removeLayer(m);
                });
                if      (region === 'USA')       { map.setView([37.09, -95.71], 4); }
                else if (region === 'India')     { map.setView([20.59,  78.96], 5); }
                else if (region === 'Australia') { map.setView([-25.27, 133.78], 4); }
                else                             { map.setView([20.0,   10.0],  2); }
                setTimeout(function () { map.invalidateSize(); }, 100);
            });
        });

        console.log('[RevenueLab Map] Initialized successfully with ' + locations.length + ' locations.');
    }

    // ── Boot: try on DOMContentLoaded first, then again on window.load ──────────
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(initMap, 100);          // short delay lets leaflet.js finish parsing
    });
    window.addEventListener('load', function () {
        if (!window._hospitalityMap) {     // don't double-init
            initMap();
        }
    });

})();