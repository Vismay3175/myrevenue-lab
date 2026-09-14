/**
 * RevenueLab - Hospitality Presence Map
 * Direct Native Leaflet Integration with MarkerCluster grouping & fallbacks
 */

(function () {
    'use strict';

    var MAX_RETRIES = 30;
    var retryCount  = 0;

    function getLeafletGlobal() {
        if (typeof window.L !== 'undefined' && typeof window.L.map === 'function') {
            return window.L;
        }
        if (typeof window.leaflet !== 'undefined' && typeof window.leaflet.map === 'function') {
            window.L = window.leaflet;
            return window.L;
        }
        return null;
    }

    function initHospitalityMap() {
        var container = document.getElementById('leaflet-presence-map');
        if (!container) { return; }

        var L = getLeafletGlobal();
        if (!L) {
            retryCount++;
            if (retryCount <= MAX_RETRIES) {
                setTimeout(initHospitalityMap, 100);
            } else {
                console.error('[RevenueLab Map] Leaflet library failed to load after ' + MAX_RETRIES + ' retries.');
            }
            return;
        }

        // Clean up previous instance for hot-reloads
        if (window._hospitalityMapInstance) {
            try { window._hospitalityMapInstance.remove(); } catch (e) {}
            window._hospitalityMapInstance = null;
        }
        if (container._leaflet_id) {
            try { delete container._leaflet_id; } catch (e) {}
        }

        // Create Map Instance
        var map = L.map('leaflet-presence-map', {
            scrollWheelZoom: false,
            zoomControl: true,
            trackResize: true
        }).setView([20.0, 10.0], 2);

        window._hospitalityMapInstance = map;

        // Tile Layer setup: Standard OpenStreetMap primary with subdomains
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            subdomains: ['a', 'b', 'c'],
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Hotel Locations Data
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

        // Custom Emerald Pin Icon
        var pinIcon = L.divIcon({
            className: 'custom-map-pin',
            html: '<div style="background-color:#059669; width:20px; height:20px; border-radius:50%; border:3px solid #FFFFFF; box-shadow:0 4px 10px rgba(5,150,105,0.5);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        // Initialize Marker Cluster Group if plugin is loaded, fallback to feature group
        var clusterGroup;
        if (typeof L.markerClusterGroup === 'function') {
            clusterGroup = L.markerClusterGroup({
                showCoverageOnHover: false,
                maxClusterRadius: 50,
                spiderfyOnMaxZoom: true,
                zoomToBoundsOnClick: true,
                iconCreateFunction: function (cluster) {
                    var count = cluster.getChildCount();
                    return L.divIcon({
                        html: '<div style="background: linear-gradient(135deg, #059669, #047857); color: #ffffff; font-weight: 800; font-size: 13px; font-family: sans-serif; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(5,150,105,0.6);">' + count + '</div>',
                        className: 'custom-cluster-icon',
                        iconSize: L.point(36, 36)
                    });
                }
            });
        } else {
            clusterGroup = L.featureGroup();
        }

        // Add Markers & Popups to Cluster Group
        var markers = [];
        locations.forEach(function (loc) {
            var marker = L.marker(loc.coords, { icon: pinIcon });
            marker._region = loc.region;

            var popupHtml =
                '<div style="padding:10px; font-family:sans-serif; min-width:180px;">' +
                    '<span style="background-color:#ECFDF5; color:#059669; font-size:10px; font-weight:800; padding:2px 8px; border-radius:9999px; text-transform:uppercase; display:inline-block; margin-bottom:6px;">' + loc.region + ' Portfolio</span>' +
                    '<h4 style="font-size:13px; font-weight:800; color:#0F172A; margin:0 0 4px 0;">' + loc.name + '</h4>' +
                    '<p style="font-size:11px; color:#64748B; margin:0 0 6px 0;">' + loc.city + ' &bull; ' + loc.keys + '</p>' +
                    '<span style="font-size:10px; font-weight:700; color:#B08D48;">' + loc.type + '</span>' +
                '</div>';

            marker.bindPopup(popupHtml);
            markers.push(marker);
            clusterGroup.addLayer(marker);
        });

        map.addLayer(clusterGroup);

        // Attach Filter Listeners with Cluster Group management
        var filterBtns = document.querySelectorAll('.map-filter-btn, #map-region-filters .map-filter-btn');
        filterBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                filterBtns.forEach(function (b) {
                    b.classList.remove('active');
                    if (b.classList.contains('bg-slate-900')) {
                        b.classList.remove('bg-slate-900', 'text-white');
                        b.classList.add('bg-slate-100', 'text-slate-700');
                    }
                });
                this.classList.add('active');
                if (this.classList.contains('bg-slate-100')) {
                    this.classList.add('bg-slate-900', 'text-white');
                    this.classList.remove('bg-slate-100', 'text-slate-700');
                }

                var region = this.getAttribute('data-region');
                
                clusterGroup.clearLayers();
                markers.forEach(function (m) {
                    if (region === 'all' || m._region === region) {
                        clusterGroup.addLayer(m);
                    }
                });

                if (region === 'USA') {
                    map.setView([37.0902, -95.7129], 4);
                } else if (region === 'India') {
                    map.setView([20.5937, 78.9629], 5);
                } else if (region === 'Australia') {
                    map.setView([-25.2744, 133.7751], 4);
                } else {
                    map.setView([20.0, 10.0], 2);
                }

                setTimeout(function () { map.invalidateSize(); }, 100);
            });
        });

        // Ensure proper map sizing across viewport changes
        [20, 100, 300, 700, 1500, 3000].forEach(function (ms) {
            setTimeout(function () {
                if (map) { map.invalidateSize(); }
            }, ms);
        });

        window.addEventListener('resize', function () {
            if (map) { map.invalidateSize(); }
        });

        console.log('[RevenueLab Map] MarkerCluster grouped presence map initialized successfully.');
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initHospitalityMap, 30);
    } else {
        document.addEventListener('DOMContentLoaded', initHospitalityMap);
    }
    window.addEventListener('load', initHospitalityMap);

})();