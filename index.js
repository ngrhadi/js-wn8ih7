// Import stylesheets
import './style.css';

import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import Draw from 'ol/interaction/Draw.js';
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Snap from "ol/interaction/Snap";
import GeoJSON from "ol/format/GeoJSON";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Snap from "ol/interaction/Snap";
import { fromLonLat } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';
import bBoxclip from '@turf/bbox-clip';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import intersect from '@turf/intersect'
import booleanWithin from '@turf/boolean-within';
import { transformExtent } from 'ol/proj';

var geojsonObject = {
  'type': 'FeatureCollection',
  "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  'features': [{
    'type': 'Feature',
    'geometry': {
      'type': 'Polygon',
      'coordinates': [[[-71.051641470913779, 47.710352336655504], [-70.911598179611758, 47.710352336655504], [-70.925150756189367, 47.619080121567436], [-70.712827056473373, 47.616034965734443], [-70.721862107525112, 47.448278226184989], [-70.857387873301292, 47.448278226184989], [-70.852870347775408, 47.552045722357249], [-71.056158996439635, 47.552045722357249], [-71.051641470913779, 47.710352336655504]]]
    }
  }
  ]
};



//#region "Restriction vector layer"
var styleRestriction = new Style({
  fill: new Fill({
    color: "#ffffff00",
  }),
  stroke: new Stroke({
    color: "#d21dda",
    width: 2,
  })
});

let restricTionSource = new VectorSource({
  features: (new GeoJSON()).readFeatures(geojsonObject, { featureProjection: "EPSG:3857" })
});
let restrictionLayer = new VectorLayer({
  source: restricTionSource,
  zIndex: 9999,
  style: styleRestriction
})

//#endregion

//#region "Draw interaction"

// some unnecessary draw style
var styleDuringDraw = new Style({
  fill: new Fill({
    color: "#5df184ab",
  }),
  stroke: new Stroke({
    color: "#fff",
    width: 2,
    lineCap: "square",
    lineDash: [10, 10],
  }),
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({
      color: "#5df184ab"
    }),
    stroke: new Stroke({
      color: "#fbfdff",
      width: 2
    })
  })
});
var styleDrawnFeatures = new Style({
  fill: new Fill({
    color: "#fff",
  }),
  stroke: new Stroke({
    color: "#ef2d05",
    width: 2,
  }),
  image: new CircleStyle({
    radius: 7,
    fill: new Fill({
      color: "#ffffff00"
    }),
    stroke: new Stroke({
      color: "#fbfdff",
      width: 2
    })
  })
});

let vectorDrawSource = new VectorSource();
let vectorDrawLayer = new VectorLayer({
  source: vectorDrawSource,
  zIndex: 9998,
  style: styleDrawnFeatures
})

let drawInteractionPolygon = new Draw({
  condition: function (e) {
    let coords = e.coordinate
    let features = olMap.getFeaturesAtPixel(e.pixel, { layerFilter: function (layer) { return layer === restrictionLayer; } });
    if (features != null && features.length > 0) {
      return true;
    } else {
      return false;
    }
  },
  type: "Polygon",
  source: vectorDrawLayer.getSource(),
  style: styleDuringDraw
});

//#endregion


//#region "Snap interaction"
let snapInteraction = new Snap({
  source: restricTionSource,
  edge: true,
  vertex: true,
});
//#endregion


//#region "Map setup"
const olMap = new Map({
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    restrictionLayer,
    vectorDrawLayer
  ],
  target: 'map',
  view: new View({
    center: [0, 0],
    zoom: 2,
    projection: 'EPSG:3857'
  })
});

let extent = restrictionLayer.getSource().getExtent();
olMap.getView().fit(extent);

//#endregion

//#region "Add map interaction"

// add draw interaction
let checkBox = document.getElementById('checkBox');
checkBox.addEventListener('click', function (e) {
  if (this.checked) {
    olMap.addInteraction(drawInteractionPolygon);
    olMap.addInteraction(snapInteraction);

    let geojsonFormat = new GeoJSON();
    let secondGeometry = restrictionLayer.getSource().getFeatures()[0];

    let firstGeometryObject = {};
    let secondGeometryObject = geojsonFormat.writeFeatureObject(secondGeometry, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });

    // add draw feature
    vectorDrawLayer.getSource().on('addfeature', (evt) => {
      let feature = evt.feature;
      let firstGeometry = vectorDrawLayer.getSource().getFeatures()[0];

      firstGeometryObject = geojsonFormat.writeFeatureObject(feature, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });

      let intersectPolygon = intersect(firstGeometryObject, secondGeometryObject);

      let polygon = new Polygon(intersectPolygon.geometry.coordinates)

      let transformedPoly = polygon.clone().transform('EPSG:4326', 'EPSG:3857').getCoordinates();

      evt.feature.getGeometry().setCoordinates(transformedPoly);

    })



  } else {
    olMap.removeInteraction(drawInteractionPolygon);
    olMap.removeInteraction(snapInteraction);
  }
});

// delete vectors
let deleteDraw = document.getElementById("deleteDraw");
deleteDraw.addEventListener('click', function (e) {
  vectorDrawLayer.getSource().clear();
})

//#endregion