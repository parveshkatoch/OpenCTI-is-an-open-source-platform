package org.opencti.model.sdo;

import org.opencti.model.StixBase;
import org.opencti.model.database.LoaderDriver;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

import static java.lang.String.format;
import static org.opencti.model.database.BaseQuery.from;

public abstract class Domain extends StixBase {

    @Override
    public void neo4j(LoaderDriver driver) {
        String type = this.getClass().getSimpleName();
        String name = type.toLowerCase();
        //Create a new domain
        String query = "MERGE (" + name + ":" + type + " { id: $id }) " +
                "ON CREATE SET " + name + " = {" +
                /**/"id: $id, " +
                /**/"created: $created, " +
                /**/"modified: $modified " +
                "} " +
                "ON MATCH SET " +
                /**/name + ".created = $created, " +
                /**/name + ".modified = $modified";
        driver.execute(from(query).withParams("id", getId(),
                "created", getCreated(),
                "modified", getModified()));

        //Create the created_ref
        if (getCreated_by_ref() != null) {
            String identityQuery = "MERGE (identity:Identity {id: $identityId}) ON CREATE SET identity={id: $identityId}";
            driver.execute(from(identityQuery).withParams("identityId", getCreated_by_ref()));
            String relationQuery = "MATCH (" + name + ":" + type + " {id: $nameId}), (identity:Identity {id: $identityId}) " +
                    "MERGE (" + name + ")-[:created_by]->(identity)";
            driver.execute(from(relationQuery).withParams("nameId", getId(), "identityId", getCreated_by_ref()));
        }

        //Marking refs
        if (object_marking_refs != null) {
            getObject_marking_refs().forEach(marking -> {
                //Create entity
                String markingQuery = "MERGE (marking:MarkingDefinition {id: $markingId}) ON CREATE SET marking={id: $markingId}";
                driver.execute(from(markingQuery).withParams("markingId", marking));
                //Create relation
                String markingRelationQuery = "MATCH (" + name + ":" + type + " {id: $nameId}), (marking:MarkingDefinition {id: $markingId}) " +
                        "MERGE (" + name + ")-[:object_marking]->(marking)";
                driver.execute(from(markingRelationQuery).withParams("nameId", getId(), "markingId", marking));
            });
        }
    }

    @Override
    public void grakn(LoaderDriver driver) {
        //Do nothing.
    }

    private String type;
    private String created;
    private String modified;
    private boolean revoked = false;
    private String created_by_ref;
    private List<String> labels;
    private List<String> object_marking_refs;


    public String getLabelChain() {
        return getLabels().stream().map(value -> format("has stix_label \"%s\"", value))
                .collect(Collectors.joining(" "));
    }

    public String clean(String s) {
        return s != null ? s.replaceAll("\"", "\\\\\"") : null;
    }

    //region fields
    public List<String> getLabels() {
        return labels;
    }

    public void setLabels(List<String> labels) {
        this.labels = labels;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getCreated() {
        ZonedDateTime zonedDateTime = ZonedDateTime.parse(created);
        return zonedDateTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }

    public void setCreated(String created) {
        this.created = created;
    }

    public String getModified() {
        return modified;
    }

    public void setModified(String modified) {
        this.modified = modified;
    }

    public boolean getRevoked() {
        return revoked;
    }

    public void setRevoked(Boolean revoked) {
        this.revoked = revoked;
    }

    public String getCreated_by_ref() {
        return created_by_ref;
    }

    public void setCreated_by_ref(String created_by_ref) {
        this.created_by_ref = created_by_ref;
    }

    public List<String> getObject_marking_refs() {
        return object_marking_refs;
    }

    public void setObject_marking_refs(List<String> object_marking_refs) {
        this.object_marking_refs = object_marking_refs;
    }
    //endregion
}
