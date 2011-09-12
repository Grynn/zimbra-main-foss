
package zimbra.generated.replicationclient.ws.service;

import javax.jws.WebMethod;
import javax.jws.WebParam;
import javax.jws.WebResult;
import javax.jws.WebService;
import javax.jws.soap.SOAPBinding;
import javax.xml.bind.annotation.XmlSeeAlso;
import zimbra.generated.replicationclient.replication.testBecomeMasterRequest;
import zimbra.generated.replicationclient.replication.testBecomeMasterResponse;
import zimbra.generated.replicationclient.replication.testBringDownServiceIPRequest;
import zimbra.generated.replicationclient.replication.testBringDownServiceIPResponse;
import zimbra.generated.replicationclient.replication.testBringUpServiceIPRequest;
import zimbra.generated.replicationclient.replication.testBringUpServiceIPResponse;
import zimbra.generated.replicationclient.replication.testReplicationStatusRequest;
import zimbra.generated.replicationclient.replication.testReplicationStatusResponse;
import zimbra.generated.replicationclient.replication.testStartCatchupRequest;
import zimbra.generated.replicationclient.replication.testStartCatchupResponse;
import zimbra.generated.replicationclient.replication.testStartFailoverClientRequest;
import zimbra.generated.replicationclient.replication.testStartFailoverClientResponse;
import zimbra.generated.replicationclient.replication.testStartFailoverDaemonRequest;
import zimbra.generated.replicationclient.replication.testStartFailoverDaemonResponse;
import zimbra.generated.replicationclient.replication.testStopFailoverClientRequest;
import zimbra.generated.replicationclient.replication.testStopFailoverClientResponse;
import zimbra.generated.replicationclient.replication.testStopFailoverDaemonRequest;
import zimbra.generated.replicationclient.replication.testStopFailoverDaemonResponse;


/**
 * This class was generated by the JAX-WS RI.
 * JAX-WS RI 2.1.7-hudson-48-
 * Generated source version: 2.1
 * 
 */
@WebService(name = "ReplicationService", targetNamespace = "http://www.zimbra.com/wsdl/ReplicationService.wsdl")
@SOAPBinding(parameterStyle = SOAPBinding.ParameterStyle.BARE)
@XmlSeeAlso({
    zimbra.generated.replicationclient.replication.ObjectFactory.class,
    zimbra.generated.replicationclient.zm.ObjectFactory.class
})
public interface ReplicationService {


    /**
     * 
     * @param parameters
     * @return
     *     returns zimbra.generated.replicationclient.replication.testBecomeMasterResponse
     */
    @WebMethod(action = "urn:zimbraRepl/BecomeMaster")
    @WebResult(name = "BecomeMasterResponse", targetNamespace = "urn:zimbraRepl", partName = "parameters")
    public testBecomeMasterResponse becomeMasterRequest(
        @WebParam(name = "BecomeMasterRequest", targetNamespace = "urn:zimbraRepl", partName = "parameters")
        testBecomeMasterRequest parameters);

    /**
     * 
     * @param parameters
     * @return
     *     returns zimbra.generated.replicationclient.replication.testBringDownServiceIPResponse
     */
    @WebMethod(action = "urn:zimbraRepl/BringDownServiceIP")
    @WebResult(name = "BringDownServiceIPResponse", targetNamespace = "urn:zimbraRepl", partName = "parameters")
    public testBringDownServiceIPResponse bringDownServiceIPRequest(
        @WebParam(name = "BringDownServiceIPRequest", targetNamespace = "urn:zimbraRepl", partName = "parameters")
        testBringDownServiceIPRequest parameters);

    /**
     * 
     * @param parameters
     * @return
     *     returns zimbra.generated.replicationclient.replication.testBringUpServiceIPResponse
     */
    @WebMethod(action = "urn:zimbraRepl/BringUpServiceIP")
    @WebResult(name = "BringUpServiceIPResponse", targetNamespace = "urn:zimbraRepl", partName = "parameters")
    public testBringUpServiceIPResponse bringUpServiceIPRequest(
        @WebParam(name = "BringUpServiceIPRequest", targetNamespace = "urn:zimbraRepl", partName = "parameters")
        testBringUpServiceIPRequest parameters);

    /**
     * 
     * @param parameters
     * @return
     *     returns zimbra.generated.replicationclient.replication.testReplicationStatusResponse
     */
    @WebMethod(action = "urn:zimbraRepl/ReplicationStatus")
    @WebResult(name = "ReplicationStatusResponse", targetNamespace = "urn:zimbraRepl", partName = "parameters")
    public testReplicationStatusResponse replicationStatusRequest(
        @WebParam(name = "ReplicationStatusRequest", targetNamespace = "urn:zimbraRepl", partName = "parameters")
        testReplicationStatusRequest parameters);

    /**
     * 
     * @param parameters
     * @return
     *     returns zimbra.generated.replicationclient.replication.testStartCatchupResponse
     */
    @WebMethod(action = "urn:zimbraRepl/StartCatchup")
    @WebResult(name = "StartCatchupResponse", targetNamespace = "urn:zimbraRepl", partName = "parameters")
    public testStartCatchupResponse startCatchupRequest(
        @WebParam(name = "StartCatchupRequest", targetNamespace = "urn:zimbraRepl", partName = "parameters")
        testStartCatchupRequest parameters);

    /**
     * 
     * @param parameters
     * @return
     *     returns zimbra.generated.replicationclient.replication.testStartFailoverClientResponse
     */
    @WebMethod(action = "urn:zimbraRepl/StartFailoverClient")
    @WebResult(name = "StartFailoverClientResponse", targetNamespace = "urn:zimbraRepl", partName = "parameters")
    public testStartFailoverClientResponse startFailoverClientRequest(
        @WebParam(name = "StartFailoverClientRequest", targetNamespace = "urn:zimbraRepl", partName = "parameters")
        testStartFailoverClientRequest parameters);

    /**
     * 
     * @param parameters
     * @return
     *     returns zimbra.generated.replicationclient.replication.testStartFailoverDaemonResponse
     */
    @WebMethod(action = "urn:zimbraRepl/StartFailoverDaemon")
    @WebResult(name = "StartFailoverDaemonResponse", targetNamespace = "urn:zimbraRepl", partName = "parameters")
    public testStartFailoverDaemonResponse startFailoverDaemonRequest(
        @WebParam(name = "StartFailoverDaemonRequest", targetNamespace = "urn:zimbraRepl", partName = "parameters")
        testStartFailoverDaemonRequest parameters);

    /**
     * 
     * @param parameters
     * @return
     *     returns zimbra.generated.replicationclient.replication.testStopFailoverClientResponse
     */
    @WebMethod(action = "urn:zimbraRepl/StopFailoverClient")
    @WebResult(name = "StopFailoverClientResponse", targetNamespace = "urn:zimbraRepl", partName = "parameters")
    public testStopFailoverClientResponse stopFailoverClientRequest(
        @WebParam(name = "StopFailoverClientRequest", targetNamespace = "urn:zimbraRepl", partName = "parameters")
        testStopFailoverClientRequest parameters);

    /**
     * 
     * @param parameters
     * @return
     *     returns zimbra.generated.replicationclient.replication.testStopFailoverDaemonResponse
     */
    @WebMethod(action = "urn:zimbraRepl/StopFailoverDaemon")
    @WebResult(name = "StopFailoverDaemonResponse", targetNamespace = "urn:zimbraRepl", partName = "parameters")
    public testStopFailoverDaemonResponse stopFailoverDaemonRequest(
        @WebParam(name = "StopFailoverDaemonRequest", targetNamespace = "urn:zimbraRepl", partName = "parameters")
        testStopFailoverDaemonRequest parameters);

}
